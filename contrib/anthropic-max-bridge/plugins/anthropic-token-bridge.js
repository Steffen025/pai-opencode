// lib/file-logger.ts
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
var LOG_PATH = "/tmp/pai-opencode-debug.log";
function fileLog(message, level = "info") {
  try {
    const timestamp = new Date().toISOString();
    const levelPrefix = level.toUpperCase().padEnd(5);
    const logLine = `[${timestamp}] [${levelPrefix}] ${message}\n`;
    const dir = dirname(LOG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(LOG_PATH, logLine);
  } catch {}
}
function fileLogError(message, error2) {
  const errorMessage = error2 instanceof Error ? `${error2.message}\n${error2.stack || ""}` : String(error2);
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
import * as os from "node:os";
import * as path from "node:path";
var AUTH_FILE = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
var REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000;
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
    fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2) + "\n", { mode: 0o600 });
    // Explicitly set permissions on existing files (mode only applies on creation)
    try {
      fs.chmodSync(AUTH_FILE, 0o600);
    } catch {}
    return true;
  } catch (err) {
    error("Failed to write auth.json", { error: String(err) });
    return false;
  }
}
function checkAnthropicToken() {
  const auth = readAuthFile();
  if (!auth) {
    return { valid: false, exists: false, expiresSoon: false, timeRemainingMs: 0, reason: "auth_file_not_readable" };
  }
  const anthropic = auth.anthropic;
  if (!anthropic) {
    return { valid: false, exists: false, expiresSoon: false, timeRemainingMs: 0, reason: "no_anthropic_config" };
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
  if (!anthropic.access) {
    return {
      valid: false,
      exists: true,
      expiresSoon: false,
      timeRemainingMs: 0,
      reason: "missing_access_token"
    };
  }
  if (typeof anthropic.expires !== "number" || !Number.isFinite(anthropic.expires)) {
    return {
      valid: false,
      exists: true,
      expiresSoon: false,
      timeRemainingMs: 0,
      reason: "invalid_expires",
      maskedAccess: maskToken(anthropic.access)
    };
  }
  const now = Date.now();
  const expires = anthropic.expires;
  const timeRemainingMs = expires - now;
  if (timeRemainingMs <= 0) {
    warn("Anthropic token expired", {
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
    warn("Anthropic token expires soon", {
      hoursRemaining,
      expiresAt: new Date(expires).toISOString(),
      maskedAccess: maskToken(anthropic.access)
    });
  } else {
    info("Anthropic token valid", {
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
function maskToken(token) {
  if (!token || token.length < 20) return "***";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

// lib/refresh-manager.ts
import { spawn } from "node:child_process";
var EXEC_TIMEOUT_MS = 15000;
var REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
var isRefreshing = false;
var lastRefreshAttempt = 0;
function isRefreshInProgress() {
  if (isRefreshing) return true;
  return Date.now() - lastRefreshAttempt < REFRESH_COOLDOWN_MS;
}
function execCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (result) => {
      if (settled) return;
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
    // pragma: allowlist secret — runtime extraction from macOS Keychain
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
    // Validate token presence without logging the raw value
    const tokenMatch = stdout.match(/sk-ant-[a-z0-9-]+/i);
    if (!tokenMatch) {
      error("Could not find token in Claude output");
      return null;
    }
    info("Successfully generated setup token");
    return tokenMatch[0]; // pragma: allowlist secret — runtime value from claude CLI, not hardcoded
  } catch (err) {
    error("Exception generating setup token", { error: String(err) });
    return null;
  }
}
async function exchangeSetupToken(setupToken) {
  try {
    info("Exchanging setup token for OAuth credentials");
    
    // AbortController timeout to prevent hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
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
    const keychainTokens = await extractFromKeychain();
    if (keychainTokens) {
      info("Found tokens in Keychain, updating auth.json");
      
      // Calculate expiresInSeconds - only use Keychain expiry if it's valid and in the future
      let expiresInSeconds;
      if (keychainTokens.expiresAt === undefined || keychainTokens.expiresAt === null) {
        // Legacy: no expiry in Keychain, use 8h default
        expiresInSeconds = 28800;
      } else if (keychainTokens.expiresAt > Date.now()) {
        // Valid future expiry
        expiresInSeconds = Math.round((keychainTokens.expiresAt - Date.now()) / 1000);
      } else {
        // Expired - don't use this token, fall through to setup-token refresh
        info("Keychain token is expired, falling through to setup-token exchange");
        expiresInSeconds = 0; // Will cause validation to fail, forcing setup-token path
      }
      
      // Only update if we have a valid expiry (not expired)
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

// anthropic-token-bridge.ts
var CHECK_INTERVAL_MESSAGES = 5;
var messageCount = 0;
async function AnthropicTokenBridge() {
  fileLog("AnthropicTokenBridge plugin loaded", "info");
  return {
    async "chat.message"(_input, output) {
      const msg = output?.message;
      if (!msg?.role || msg.role !== "user") return;
      messageCount++;
      if (messageCount % CHECK_INTERVAL_MESSAGES !== 0) return;
      try {
        fileLog(`Checking token status (message #${messageCount})`, "debug");
        const status = checkAnthropicToken();
        if (!status.exists && status.reason === "auth_file_not_readable") {
          fileLog("auth.json not readable, skipping", "debug");
          return;
        }
        if (status.valid && !status.expiresSoon) {
          fileLog("Token valid, no refresh needed", "debug");
          return;
        }
        if (!status.exists || status.expiresSoon || !status.valid) {
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
    // At session start: ALWAYS sync from Keychain first, then check expiry.
    // Keychain always has the freshest token — auth.json can be stale even if
    // its `expires` timestamp looks valid (e.g. token was invalidated by re-auth).
    async "experimental.chat.system.transform"(_input, _output) {
      try {
        fileLog("Session started, syncing token from Keychain", "info");

        // Step 1: Always attempt Keychain → auth.json sync at session start
        try {
          const keychainTokens = await extractFromKeychain();
          if (keychainTokens) {
            const { accessToken, refreshToken, expiresAt } = keychainTokens;

            // Check if Keychain token differs from auth.json (for logging)
            const currentStatus = checkAnthropicToken();
            const currentAccess = currentStatus.maskedAccess;
            const keychainMasked = `${accessToken.slice(0, 8)}...${accessToken.slice(-4)}`;

            if (currentAccess !== keychainMasked) {
              fileLog(`Keychain token differs from auth.json \u2014 syncing (auth:${currentAccess} keychain:${keychainMasked})`, "warn");
            } else {
              fileLog("Keychain token matches auth.json", "debug");
            }

            // Always write Keychain token to auth.json (it's the source of truth)
            let expiresInSeconds;
            if (expiresAt === undefined || expiresAt === null) {
              expiresInSeconds = 28800; // 8h default
            } else if (expiresAt > Date.now()) {
              expiresInSeconds = Math.round((expiresAt - Date.now()) / 1000);
            } else {
              // Keychain token is also expired — fall through to setup-token refresh
              expiresInSeconds = 0;
            }

            if (expiresInSeconds > 0) {
              const synced = updateAnthropicTokens(accessToken, refreshToken, expiresInSeconds);
              if (synced) {
                const hoursRemaining = Math.floor(expiresInSeconds / 3600);
                fileLog(`Keychain\u2192auth.json sync successful, token valid for ${hoursRemaining}h`, "info");
                return; // Done — fresh token written, no further refresh needed
              } else {
                fileLog("Keychain\u2192auth.json sync failed (write error), falling back to refresh", "error");
              }
            } else {
              fileLog("Keychain token is also expired, triggering full refresh", "warn");
            }
          } else {
            fileLog("Could not read Keychain, falling back to auth.json check", "warn");
          }
        } catch (keychainErr) {
          fileLogError("Error during Keychain sync at session start", keychainErr);
        }

        // Step 2: Fallback — check auth.json and refresh if expired/expiring
        const status = checkAnthropicToken();
        if (!status.exists && status.reason === "auth_file_not_readable") {
          fileLog("auth.json not readable at session start", "debug");
          return;
        }
        if (!status.exists || status.expiresSoon || !status.valid) {
          fileLog("Token expired or expiring soon, triggering full refresh", "warn");
          try {
            if (!isRefreshInProgress()) {
              fileLog("Starting immediate synchronous token refresh", "info");
              const success = await refreshAnthropicToken();
              if (success) {
                fileLog("Session-start token refresh successful", "info");
              } else {
                fileLog("Session-start token refresh failed - will retry async", "error");
                setTimeout(() => refreshAnthropicToken(), 3e4);
              }
            }
          } catch (err) {
            fileLogError("Error during immediate token refresh", err);
          }
        } else {
          const hoursRemaining = Math.floor(status.timeRemainingMs / (60 * 60 * 1000));
          fileLog(`Token valid for ${hoursRemaining}h at session start (after fallback check)`, "info");
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
