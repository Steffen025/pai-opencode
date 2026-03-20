// lib/file-logger.ts
import { appendFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { dirname } from "path";
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
function fileLogError(message, error) {
  const errorMessage = error instanceof Error ? `${error.message}
${error.stack || ""}` : String(error);
  fileLog(`${message}: ${errorMessage}`, "error");
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

// lib/token-utils.ts
import * as fs from "node:fs";
import * as path from "node:path";
var AUTH_FILE = path.join(process.env.HOME || "~", ".local", "share", "opencode", "auth.json");
var REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000;
async function readAuthFile() {
  try {
    const content = fs.readFileSync(AUTH_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    await error("Failed to read auth.json", { error: String(err) });
    return null;
  }
}
async function writeAuthFile(authData) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2) + `
`);
    return true;
  } catch (err) {
    await error("Failed to write auth.json", { error: String(err) });
    return false;
  }
}
async function checkAnthropicToken() {
  const auth = await readAuthFile();
  if (!auth) {
    return {
      valid: false,
      exists: false,
      expiresSoon: false,
      timeRemainingMs: 0,
      reason: "auth_file_not_readable"
    };
  }
  const anthropic = auth.anthropic;
  if (!anthropic) {
    return {
      valid: false,
      exists: false,
      expiresSoon: false,
      timeRemainingMs: 0,
      reason: "no_anthropic_config"
    };
  }
  if (anthropic.type !== "oauth") {
    return {
      valid: false,
      exists: true,
      expiresSoon: false,
      timeRemainingMs: 0,
      reason: "not_oauth_type",
      maskedAccess: maskToken(anthropic.access)
    };
  }
  const now = Date.now();
  const expires = anthropic.expires;
  const timeRemainingMs = expires - now;
  if (timeRemainingMs <= 0) {
    await warn("Anthropic token expired", {
      expiredAt: new Date(expires).toISOString(),
      maskedAccess: maskToken(anthropic.access)
    });
    return {
      valid: false,
      exists: true,
      expiresSoon: true,
      timeRemainingMs: 0,
      expiresAt: new Date(expires),
      maskedAccess: maskToken(anthropic.access),
      reason: "token_expired"
    };
  }
  const expiresSoon = timeRemainingMs < REFRESH_THRESHOLD_MS;
  const hoursRemaining = Math.floor(timeRemainingMs / (60 * 60 * 1000));
  if (expiresSoon) {
    await warn("Anthropic token expires soon", {
      hoursRemaining,
      expiresAt: new Date(expires).toISOString(),
      maskedAccess: maskToken(anthropic.access)
    });
  } else {
    await info("Anthropic token valid", {
      hoursRemaining,
      expiresAt: new Date(expires).toISOString()
    });
  }
  return {
    valid: true,
    exists: true,
    expiresSoon,
    timeRemainingMs,
    expiresAt: new Date(expires),
    maskedAccess: maskToken(anthropic.access),
    reason: expiresSoon ? "expires_soon" : "valid"
  };
}
async function updateAnthropicTokens(accessToken, refreshToken, expiresInSeconds) {
  const auth = await readAuthFile();
  if (!auth) {
    await error("Cannot update tokens: auth.json not readable");
    return false;
  }
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  auth.anthropic = {
    type: "oauth",
    access: accessToken,
    refresh: refreshToken,
    expires: expiresAt
  };
  const success = await writeAuthFile(auth);
  if (success) {
    await info("Updated anthropic tokens", {
      expiresAt: new Date(expiresAt).toISOString(),
      maskedAccess: maskToken(accessToken)
    });
  }
  return success;
}
function maskToken(token) {
  if (!token || token.length < 20)
    return "***";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

// lib/refresh-manager.ts
import { spawn } from "child_process";
import { promisify } from "util";
var exec = promisify(spawn);
var isRefreshing = false;
var lastRefreshAttempt = 0;
var REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
function isRefreshInProgress() {
  if (isRefreshing)
    return true;
  const timeSinceLastAttempt = Date.now() - lastRefreshAttempt;
  return timeSinceLastAttempt < REFRESH_COOLDOWN_MS;
}
async function execCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
    child.on("error", (err) => {
      resolve({ stdout, stderr: String(err), exitCode: 1 });
    });
  });
}
async function extractFromKeychain() {
  try {
    const { stdout, exitCode } = await execCommand("security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-w"
    ]);
    if (exitCode !== 0) {
      await error("Failed to extract from Keychain", { exitCode, stderr: stdout });
      return null;
    }
    const credentials = JSON.parse(stdout.trim());
    const accessToken = credentials.accessToken || credentials.access_token;
    const refreshToken = credentials.refreshToken || credentials.refresh_token;
    if (!accessToken || !refreshToken) {
      await error("Invalid credentials format from Keychain", {
        hasAccess: !!accessToken,
        hasRefresh: !!refreshToken
      });
      return null;
    }
    return {
      accessToken,
      refreshToken
    };
  } catch (err) {
    await error("Exception extracting from Keychain", { error: String(err) });
    return null;
  }
}
async function generateSetupToken() {
  try {
    await info("Generating new setup token via Claude Code");
    const { stdout, exitCode, stderr } = await execCommand("claude", ["setup-token"]);
    if (exitCode !== 0) {
      await error("claude setup-token failed", { exitCode, stderr });
      return null;
    }
    const tokenMatch = stdout.match(/sk-ant-[a-z0-9-]+/i);
    if (!tokenMatch) {
      await error("Could not find token in Claude output", { output: stdout.slice(0, 200) });
      return null;
    }
    await info("Successfully generated setup token");
    return tokenMatch[0];
  } catch (err) {
    await error("Exception generating setup token", { error: String(err) });
    return null;
  }
}
async function exchangeSetupToken(setupToken) {
  try {
    await info("Exchanging setup token for OAuth credentials");
    const response = await fetch("https://api.anthropic.com/v1/oauth/setup_token/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${setupToken}`,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        grant_type: "setup_token"
      })
    });
    if (!response.ok) {
      await error("Token exchange failed", { status: response.status });
      return null;
    }
    const data = await response.json();
    if (!data.access_token || !data.refresh_token) {
      await error("Invalid exchange response", { hasAccess: !!data.access_token, hasRefresh: !!data.refresh_token });
      return null;
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 28800
    };
  } catch (err) {
    await error("Exception exchanging setup token", { error: String(err) });
    return null;
  }
}
async function refreshAnthropicToken() {
  if (isRefreshing) {
    await info("Refresh already in progress, skipping");
    return false;
  }
  const timeSinceLastAttempt = Date.now() - lastRefreshAttempt;
  if (timeSinceLastAttempt < REFRESH_COOLDOWN_MS) {
    await info("Refresh on cooldown", { minutesRemaining: Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastAttempt) / 60000) });
    return false;
  }
  isRefreshing = true;
  lastRefreshAttempt = Date.now();
  try {
    await info("Starting token refresh process");
    const keychainTokens = await extractFromKeychain();
    if (keychainTokens) {
      await info("Found tokens in Keychain, updating auth.json");
      const success2 = await updateAnthropicTokens(keychainTokens.accessToken, keychainTokens.refreshToken, 28800);
      if (success2) {
        await info("Token refresh successful via Keychain");
        return true;
      }
    }
    await info("Keychain extraction failed, generating new setup token");
    const setupToken = await generateSetupToken();
    if (!setupToken) {
      await error("Failed to generate setup token - is Claude Code authenticated?");
      return false;
    }
    const oauthTokens = await exchangeSetupToken(setupToken);
    if (!oauthTokens) {
      await error("Failed to exchange setup token");
      return false;
    }
    const success = await updateAnthropicTokens(oauthTokens.accessToken, oauthTokens.refreshToken, oauthTokens.expiresIn);
    if (success) {
      await info("Token refresh successful via setup token exchange");
      return true;
    }
    return false;
  } catch (err) {
    await error("Unexpected error during refresh", { error: String(err) });
    return false;
  } finally {
    isRefreshing = false;
  }
}

// anthropic-token-bridge.ts
var CHECK_INTERVAL_MESSAGES = 5;
var messageCount = 0;
async function AnthropicTokenBridge() {
  fileLog("AnthropicTokenBridge plugin loaded", "info");
  return {
    async "chat.message"(input, output) {
      if (input.role !== "user") {
        return;
      }
      messageCount++;
      if (messageCount % CHECK_INTERVAL_MESSAGES !== 0) {
        return;
      }
      try {
        fileLog(`Checking token status (message #${messageCount})`, "debug");
        const status = await checkAnthropicToken();
        if (!status.exists) {
          fileLog("No Anthropic OAuth token configured", "debug");
          return;
        }
        if (status.valid && !status.expiresSoon) {
          fileLog("Token valid, no refresh needed", "debug");
          return;
        }
        if (status.expiresSoon) {
          const hoursRemaining = Math.floor(status.timeRemainingMs / (60 * 60 * 1000));
          fileLog(`Token expires in ${hoursRemaining}h, triggering refresh`, "warn");
          if (isRefreshInProgress()) {
            fileLog("Refresh already in progress, skipping", "info");
            return;
          }
          fileLog("Starting async token refresh", "info");
          refreshAnthropicToken().then((success) => {
            if (success) {
              fileLog("Token refresh completed successfully", "info");
            } else {
              fileLog("Token refresh failed - will retry on next check", "error");
            }
          }).catch((err) => {
            fileLogError("Unexpected error during refresh", err);
          });
        }
      } catch (err) {
        fileLogError("Error in chat.message handler", err);
      }
    },
    async "experimental.chat.system.transform"(input, output) {
      try {
        fileLog("Session started, checking initial token status", "info");
        const status = await checkAnthropicToken();
        if (!status.exists) {
          fileLog("No Anthropic token configured at session start", "debug");
          return;
        }
        if (status.expiresSoon) {
          fileLog("Token expires soon at session start, scheduling refresh", "warn");
          setTimeout(() => {
            if (!isRefreshInProgress()) {
              refreshAnthropicToken().then((success) => {
                if (success) {
                  fileLog("Session-start refresh successful", "info");
                }
              }).catch((err) => {
                fileLogError("Session-start refresh error", err);
              });
            }
          }, 5000);
        } else {
          const hoursRemaining = Math.floor(status.timeRemainingMs / (60 * 60 * 1000));
          fileLog(`Token valid for ${hoursRemaining}h at session start`, "info");
        }
      } catch (err) {
        fileLogError("Error in system.transform handler", err);
      }
    }
  };
}
export {
  AnthropicTokenBridge as default
};
