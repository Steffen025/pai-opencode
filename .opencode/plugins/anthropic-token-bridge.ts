import { fileLog, fileLogError } from "./lib/file-logger.ts";
import { isRefreshInProgress, refreshAnthropicToken } from "./lib/refresh-manager.ts";
import { checkAnthropicToken } from "./lib/token-utils.ts";

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

		// At session start: check token and schedule early refresh if expiring soon
		async "experimental.chat.system.transform"(_input: unknown, _output: unknown) {
			try {
				fileLog("Session started, checking initial token status", "info");
				const status = checkAnthropicToken();

				if (!status.exists && status.reason === "auth_file_not_readable") {
					fileLog("auth.json not readable at session start", "debug");
					return;
				}

			if (!status.exists || status.expiresSoon || !status.valid) {
				fileLog("Token expired or expiring soon at session start, refreshing immediately", "warn");
				
				// Refresh synchronously at session start to prevent API errors
				try {
					if (!isRefreshInProgress()) {
						fileLog("Starting immediate synchronous token refresh", "info");
						const success = await refreshAnthropicToken();
						if (success) {
							fileLog("Session-start token refresh successful", "info");
						} else {
							fileLog("Session-start token refresh failed - will retry async", "error");
							// Fall back to async retry
							setTimeout(() => refreshAnthropicToken(), 30000);
						}
					}
				} catch (err) {
					fileLogError("Error during immediate token refresh", err);
				}
			} else {
					const hoursRemaining = Math.floor(status.timeRemainingMs / (60 * 60 * 1000));
					fileLog(`Token valid for ${hoursRemaining}h at session start`, "info");
				}
			} catch (err) {
				fileLogError("Error in system.transform handler", err);
			}
		},
	};
}

export default AnthropicTokenBridge;
