// .opencode/plugins/lib/refresh-manager.ts
import { spawn } from "node:child_process";
import * as fs2 from "node:fs";
import * as os2 from "node:os";
import * as path2 from "node:path";

// .opencode/plugins/lib/file-logger.ts
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
var LOG_PATH = "/tmp/pai-opencode-debug.log";
function fileLog(message, level = "info") {
  try {
    const timestamp = new Date().toISOString();
    const levelPrefix = level.toUpperCase().padEnd(5);
    const logLine = `[${timestamp}] [${levelPrefix}] ${message}
`;
    const dir = dirname(LOG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(LOG_PATH, logLine);
  } catch {}
}
function info(message, meta) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  fileLog(`${message}${metaStr}`, "info");
}
function warn(message, meta) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  fileLog(`${message}${metaStr}`, "warn");
}
function error(message, meta) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  fileLog(`${message}${metaStr}`, "error");
}

// .opencode/plugins/lib/token-utils.ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
var AUTH_FILE = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
var REFRESH_THRESHOLD_MS = 60 * 60 * 1000;
function readAuthFile() {
  try {
    const content = fs.readFileSync(AUTH_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    error("Failed to read auth.json", { error: String(err) });
    return null;
  }
}
function writeAuthFile(authData) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2) + `
`, { mode: 384 });
    return true;
  } catch (err) {
    error("Failed to write auth.json", { error: String(err) });
    return false;
  }
}
function maskToken(token) {
  if (!token || token.length < 20)
    return "***";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}
function updateAnthropicTokens(accessToken, refreshToken, expiresInSeconds) {
  const auth = readAuthFile();
  if (!auth) {
    error("Cannot update tokens: auth.json not readable");
    return false;
  }
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  auth.anthropic = {
    type: "oauth",
    access: accessToken,
    refresh: refreshToken,
    expires: expiresAt
  };
  const success = writeAuthFile(auth);
  if (success) {
    info("Updated anthropic tokens", {
      expiresAt: new Date(expiresAt).toISOString(),
      maskedAccess: maskToken(accessToken)
    });
  }
  return success;
}

// .opencode/plugins/lib/refresh-manager.ts
var EXEC_TIMEOUT_MS = 15000;
var REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
var AUTH_FILE2 = path2.join(os2.homedir(), ".local", "share", "opencode", "auth.json");
var isRefreshing = false;
var lastRefreshAttempt = 0;
function getExistingRefreshToken() {
  try {
    const content = fs2.readFileSync(AUTH_FILE2, "utf8");
    const auth = JSON.parse(content);
    if (auth.anthropic?.type === "oauth" && auth.anthropic.refresh) {
      return auth.anthropic.refresh;
    }
    return null;
  } catch {
    return null;
  }
}
function isRefreshInProgress() {
  if (isRefreshing)
    return true;
  return Date.now() - lastRefreshAttempt < REFRESH_COOLDOWN_MS;
}
function execCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (result) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      settle({ stdout, stderr: "timeout", exitCode: 1 });
    }, EXEC_TIMEOUT_MS);
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (exitCode) => {
      settle({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
    child.on("error", (err) => {
      settle({ stdout, stderr: String(err), exitCode: 1 });
    });
  });
}
async function extractFromKeychain() {
  try {
    const { stdout, stderr, exitCode } = await execCommand("security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-w"
    ]);
    if (exitCode !== 0) {
      error("Failed to extract from Keychain", { exitCode, stderr });
      return null;
    }
    const credentials = JSON.parse(stdout.trim());
    const oauth = credentials.claudeAiOauth;
    const accessToken = oauth?.accessToken ?? credentials.accessToken ?? credentials.access_token;
    const refreshToken = oauth?.refreshToken ?? credentials.refreshToken ?? credentials.refresh_token;
    if (!accessToken || !refreshToken) {
      error("Invalid credentials format from Keychain", {
        hasAccess: !!accessToken,
        hasRefresh: !!refreshToken
      });
      return null;
    }
    const expiresAt = oauth?.expiresAt;
    return { accessToken, refreshToken, expiresAt };
  } catch (err) {
    error("Exception extracting from Keychain", { error: String(err) });
    return null;
  }
}
async function generateSetupToken() {
  try {
    info("Generating new setup token via Claude Code");
    const { stdout, exitCode, stderr } = await execCommand("claude", ["setup-token"]);
    if (exitCode !== 0) {
      error("claude setup-token failed", { exitCode, stderr });
      return null;
    }
    const tokenMatch = stdout.match(/sk-ant-[a-z0-9-]+/i);
    if (!tokenMatch) {
      error("Could not find token in Claude output");
      return null;
    }
    info("Successfully generated setup token");
    return tokenMatch[0];
  } catch (err) {
    error("Exception generating setup token", { error: String(err) });
    return null;
  }
}
var ANTHROPIC_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
var ANTHROPIC_TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";
async function refreshWithOAuthToken(existingRefreshToken, attempt = 1) {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;
  try {
    info(`Refreshing OAuth token via Anthropic token endpoint (attempt ${attempt}/${MAX_RETRIES})`);
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), 1e4);
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: existingRefreshToken,
      client_id: ANTHROPIC_OAUTH_CLIENT_ID
    });
    const response = await fetch(ANTHROPIC_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "anthropic-version": "2023-06-01",
        "User-Agent": "claude-cli/2.0 (OpenCode Token Bridge)"
      },
      body: params.toString(),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errorText = await response.text();
      const errorData = JSON.parse(errorText);
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        warn(`OAuth refresh rate limited (429), retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return refreshWithOAuthToken(existingRefreshToken, attempt + 1);
      }
      if (errorData.error?.type === "invalid_grant") {
        error("OAuth refresh failed - refresh token invalid or revoked", { status: response.status, error: errorText });
        return null;
      }
      error("OAuth refresh failed", { status: response.status, error: errorText });
      return null;
    }
    const data = await response.json();
    if (!data.access_token || !data.refresh_token) {
      error("Invalid OAuth refresh response", {
        hasAccess: !!data.access_token,
        hasRefresh: !!data.refresh_token
      });
      return null;
    }
    info("OAuth refresh successful - received new access and refresh tokens");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 28800
    };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      warn(`OAuth refresh network error, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`, { error: String(err) });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return refreshWithOAuthToken(existingRefreshToken, attempt + 1);
    }
    error("Exception during OAuth refresh (max retries exceeded)", { error: String(err) });
    return null;
  }
}
async function exchangeSetupToken(setupToken) {
  try {
    info("Exchanging setup token for OAuth credentials");
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), 1e4);
    const response = await fetch("https://api.anthropic.com/v1/oauth/setup_token/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${setupToken}`,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ grant_type: "setup_token" }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      error("Token exchange failed", { status: response.status });
      return null;
    }
    const data = await response.json();
    if (!data.access_token || !data.refresh_token) {
      error("Invalid exchange response", {
        hasAccess: !!data.access_token,
        hasRefresh: !!data.refresh_token
      });
      return null;
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 28800
    };
  } catch (err) {
    error("Exception exchanging setup token", { error: String(err) });
    return null;
  }
}
async function refreshAnthropicToken() {
  if (isRefreshing) {
    info("Refresh already in progress, skipping");
    return false;
  }
  const timeSinceLastAttempt = Date.now() - lastRefreshAttempt;
  if (timeSinceLastAttempt < REFRESH_COOLDOWN_MS) {
    info("Refresh on cooldown", {
      minutesRemaining: Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastAttempt) / 60000)
    });
    return false;
  }
  isRefreshing = true;
  lastRefreshAttempt = Date.now();
  try {
    info("Starting token refresh process");
    const existingRefreshToken = getExistingRefreshToken();
    if (existingRefreshToken) {
      info("Attempting OAuth refresh with existing refresh_token");
      const refreshedTokens = await refreshWithOAuthToken(existingRefreshToken);
      if (refreshedTokens) {
        const success2 = updateAnthropicTokens(refreshedTokens.accessToken, refreshedTokens.refreshToken, refreshedTokens.expiresIn);
        if (success2) {
          info("Token refresh successful via OAuth refresh_token API");
          return true;
        }
      }
      info("OAuth refresh failed, falling back to Keychain");
    } else {
      info("No existing refresh_token found, skipping OAuth refresh");
    }
    const keychainTokens = await extractFromKeychain();
    if (keychainTokens) {
      info("Found tokens in Keychain, updating auth.json");
      let expiresInSeconds;
      if (keychainTokens.expiresAt === undefined || keychainTokens.expiresAt === null) {
        expiresInSeconds = 28800;
      } else if (keychainTokens.expiresAt > Date.now()) {
        expiresInSeconds = Math.round((keychainTokens.expiresAt - Date.now()) / 1000);
      } else {
        info("Keychain token is expired, falling through to setup-token exchange");
        expiresInSeconds = 0;
      }
      if (expiresInSeconds > 0) {
        const success2 = updateAnthropicTokens(keychainTokens.accessToken, keychainTokens.refreshToken, expiresInSeconds);
        if (success2) {
          info("Token refresh successful via Keychain");
          return true;
        }
      }
    }
    info("Keychain extraction failed, generating new setup token");
    const setupToken = await generateSetupToken();
    if (!setupToken) {
      error("Failed to generate setup token - is Claude Code authenticated?");
      return false;
    }
    const oauthTokens = await exchangeSetupToken(setupToken);
    if (!oauthTokens) {
      error("Failed to exchange setup token");
      return false;
    }
    const success = updateAnthropicTokens(oauthTokens.accessToken, oauthTokens.refreshToken, oauthTokens.expiresIn);
    if (success) {
      info("Token refresh successful via setup token exchange");
      return true;
    }
    return false;
  } catch (err) {
    error("Unexpected error during refresh", { error: String(err) });
    return false;
  } finally {
    isRefreshing = false;
  }
}
export {
  refreshAnthropicToken,
  isRefreshInProgress,
  extractFromKeychain
};
