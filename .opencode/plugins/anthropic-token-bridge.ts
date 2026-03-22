import { fileLog, fileLogError } from "./lib/file-logger.ts";
import { extractFromKeychain, isRefreshInProgress, refreshAnthropicToken } from "./lib/refresh-manager.ts";
import { checkAnthropicToken, updateAnthropicTokens } from "./lib/token-utils.ts";

const CHECK_INTERVAL_MESSAGES = 5;
let messageCount = 0;

async function AnthropicTokenBridge() {
	fileLog("AnthropicTokenBridge plugin loaded", "info");

	return {
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
				}
			} catch (err) {
				fileLogError("Error in chat.message handler", err);
			}
		},

		// At session start: ALWAYS sync from Keychain first, then check expiry.
		// Keychain always has the freshest token — auth.json can be stale even if
		// its `expires` timestamp looks valid (e.g. token was invalidated by re-auth).
		async "experimental.chat.system.transform"(_input: unknown, _output: unknown) {
			try {
				fileLog("Session started, syncing token from Keychain", "info");

				// Step 1: Always attempt Keychain → auth.json sync at session start
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
