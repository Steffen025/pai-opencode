// .opencode/plugins/lib/token-utils.ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

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
  const tmpFile = `${AUTH_FILE}.tmp.${process.pid}.${Date.now()}`;
  try {
    const content = JSON.stringify(authData, null, 2) + `
`;
    fs.writeFileSync(tmpFile, content, { mode: 384 });
    fs.renameSync(tmpFile, AUTH_FILE);
    return true;
  } catch (err) {
    error("Failed to write auth.json", { error: String(err) });
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
    return false;
  }
}
function maskToken(token) {
  if (!token || token.length < 20)
    return "***";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
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
export {
  updateAnthropicTokens,
  maskToken,
  checkAnthropicToken
};
