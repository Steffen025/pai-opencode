import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileLog, fileLogError } from "./lib/file-logger.ts";
import { extractFromKeychain, isRefreshInProgress, refreshAnthropicToken } from "./lib/refresh-manager.ts";
import { checkAnthropicToken, updateAnthropicTokens } from "./lib/token-utils.ts";

const CHECK_INTERVAL_MESSAGES = 5;
const PROACTIVE_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // Refresh when < 60 minutes remaining (proactive)
const KEEPALIVE_INTERVAL_MS = 30 * 60 * 1000; // Ping every 30 minutes to keep token alive
let messageCount = 0;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

// Keep-alive ping to prevent token expiration
// Uses the /api/oauth/usage endpoint which is lightweight and doesn't consume tokens
async function keepAlivePing() {
	try {
		const status = checkAnthropicToken();
		if (!status.exists || !status.valid) {
			fileLog("Keep-alive: No valid token, skipping ping", "debug");
			return;
		}

		// Get the access token from auth.json (use module-scope imports, not dynamic)
		const authFile = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
		const content = fs.readFileSync(authFile, "utf8");
		const auth = JSON.parse(content) as { anthropic?: { access?: string } };
		const accessToken = auth.anthropic?.access;

		if (!accessToken) {
			fileLog("Keep-alive: No access token found", "debug");
			return;
		}

		fileLog("Keep-alive: Pinging Anthropic usage endpoint", "info");

		// Ping the usage endpoint - this keeps the token active without consuming tokens
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000);

		const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
				"anthropic-version": "2023-06-01",
				"User-Agent": "claude-cli/2.0 (OpenCode Token Bridge)",
			},
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (response.ok) {
			const data = await response.json() as { five_hour?: { utilization?: number } };
			fileLog(`Keep-alive: Ping successful (5h usage: ${data.five_hour?.utilization ?? 'unknown'}%)`, "info");
		} else if (response.status === 429) {
			// Rate limited on usage endpoint - not critical, just log it
			fileLog("Keep-alive: Rate limited on usage endpoint (non-critical)", "warn");
		} else {
			fileLog(`Keep-alive: Usage endpoint returned ${response.status}`, "warn");
		}
	} catch (err) {
		fileLogError("Keep-alive: Error during ping", err);
	}
}

// Start the keep-alive timer
function startKeepAlive() {
	if (keepaliveTimer) {
		clearInterval(keepaliveTimer);
	}

	fileLog(`Starting keep-alive timer (interval: ${KEEPALIVE_INTERVAL_MS / 60000} minutes)`, "info");

	// First ping after 5 minutes (to let everything settle after startup)
	setTimeout(() => {
		keepAlivePing();
		// Then ping every 30 minutes
		keepaliveTimer = setInterval(keepAlivePing, KEEPALIVE_INTERVAL_MS);
	}, 5 * 60 * 1000);
}

async function AnthropicTokenBridge() {
	fileLog("AnthropicTokenBridge plugin loaded", "info");

	return {
		// EARLIEST HOOK: Config runs during plugin initialization, before any auth checks
		// This is our chance to refresh the token BEFORE OpenCode checks it
		async config(_config: unknown) {
			try {
				fileLog("Plugin config hook running - early token refresh opportunity", "info");

			// Check token status immediately during plugin load
			const status = checkAnthropicToken();
			if (!status.exists) {
				fileLog("No Anthropic token found during config hook, skipping early refresh", "info");
				// Still start keep-alive in case token gets added later
				startKeepAlive();
				return;
			}

				const minutesRemaining = Math.floor(status.timeRemainingMs / (60 * 1000));
				fileLog(`Config hook: Token has ${minutesRemaining} minutes remaining`, "info");

			// If token is expired or expiring soon, kick off a non-blocking refresh.
			// expiresSoon is true when timeRemainingMs < REFRESH_THRESHOLD_MS (both 1h),
			// so checking expiresSoon is sufficient — no need to repeat the ms comparison.
			if (!status.valid || status.expiresSoon) {
				fileLog(`Config hook: Token needs refresh (${minutesRemaining}m left), attempting early refresh`, "warn");

				if (!isRefreshInProgress()) {
					// Fire-and-forget: do NOT await so plugin init is not blocked
					refreshAnthropicToken()
						.then((success) => {
							if (success) {
								fileLog("Config hook: Early token refresh successful - browser popup should be avoided", "info");
							} else {
								fileLog("Config hook: Early refresh failed - OpenCode may open browser", "error");
							}
						})
						.catch((err: unknown) => {
							fileLogError("Config hook: Unexpected error during refresh", err);
						});
				} else {
					fileLog("Config hook: Refresh already in progress, skipping", "info");
				}
			} else {
				fileLog(`Config hook: Token valid for ${minutesRemaining}m, no early refresh needed`, "info");
			}

			// Start the keep-alive timer regardless of whether we refreshed
			// This keeps the token active by periodically pinging the usage endpoint
			startKeepAlive();
		} catch (err) {
			fileLogError("Error in config hook", err);
		}
	},

		// Check token every N user messages, refresh automatically if expiring
		async "chat.message"(_input: unknown, output: unknown) {
			const msg = (output as { message?: { role?: string } })?.message;
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

				// PROACTIVE REFRESH: Refresh when < 60 minutes remaining, not just when expired
				const minutesRemaining = Math.floor(status.timeRemainingMs / (60 * 1000));
				const needsRefresh = !status.valid || status.expiresSoon || status.timeRemainingMs < PROACTIVE_REFRESH_THRESHOLD_MS;

				if (!needsRefresh) {
					fileLog(`Token valid for ${minutesRemaining}m, no refresh needed`, "debug");
					return;
				}

				fileLog(`Token expires in ${minutesRemaining}m, triggering refresh`, "warn");

				if (isRefreshInProgress()) {
					fileLog("Refresh already in progress, skipping", "info");
					return;
				}

				fileLog("Starting async token refresh", "info");
				refreshAnthropicToken()
					.then((success) => {
						if (success) {
							fileLog("Token refresh completed successfully", "info");
						} else {
							fileLog("Token refresh failed - will retry on next check", "error");
						}
					})
					.catch((err: unknown) => {
						fileLogError("Unexpected error during refresh", err);
					});
			} catch (err) {
				fileLogError("Error in chat.message handler", err);
			}
		},

		// At session start: check auth.json first. Only sync from Keychain if token is
		// expired/missing — Keychain is often stale (Claude Code refreshes in-memory only).
		async "experimental.chat.system.transform"(_input: unknown, _output: unknown) {
			try {
				fileLog("Session started, syncing token from Keychain", "info");

				// Fast path: if auth.json token is already valid with >60min remaining, skip Keychain sync
				const quickCheck = checkAnthropicToken();
				if (quickCheck.valid && !quickCheck.expiresSoon) {
					const hoursRemaining = Math.floor(quickCheck.timeRemainingMs / (60 * 60 * 1000));
					fileLog(`Token valid for ${hoursRemaining}h at session start (after fallback check)`, "info");
					return;
				}

				// Step 1: Only attempt Keychain → auth.json sync if token is expired/expiring
				fileLog("Token expired or expiring soon, attempting Keychain sync", "warn");
				try {
					const keychainTokens = await extractFromKeychain();
					if (keychainTokens) {
						const { accessToken, refreshToken, expiresAt } = keychainTokens;

						// Check if Keychain token differs from auth.json (for logging)
						const currentStatus = checkAnthropicToken();
						const currentAccess = currentStatus.maskedAccess;
						const keychainMasked = `${accessToken.slice(0, 8)}...${accessToken.slice(-4)}`;

						if (currentAccess !== keychainMasked) {
							fileLog(`Keychain token differs from auth.json — syncing (auth:${currentAccess} keychain:${keychainMasked})`, "warn");
						} else {
							fileLog("Keychain token matches auth.json", "debug");
						}

						// Always write Keychain token to auth.json (it's the source of truth)
						let expiresInSeconds: number;
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
								fileLog(`Keychain→auth.json sync successful, token valid for ${hoursRemaining}h`, "info");
								return; // Done — fresh token written, no further refresh needed
							} else {
								fileLog("Keychain→auth.json sync failed (write error), falling back to refresh", "error");
							}
						} else {
							fileLog("Keychain token is also expired, triggering full refresh", "warn");
						}
					} else {
						fileLog("Could not read Keychain, falling back to auth.json check", "warn");
					}
				} catch (keychainErr: unknown) {
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
								setTimeout(() => refreshAnthropicToken(), 30000);
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
		},
	};
}

export default AnthropicTokenBridge;
