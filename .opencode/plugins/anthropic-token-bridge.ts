import { fileLog, fileLogError } from "./lib/file-logger.ts";
import { isRefreshInProgress, refreshAnthropicToken } from "./lib/refresh-manager.ts";
import { checkAnthropicToken } from "./lib/token-utils.ts";

const CHECK_INTERVAL_MESSAGES = 5;
let messageCount = 0;

async function AnthropicTokenBridge() {
	fileLog("AnthropicTokenBridge plugin loaded", "info");

	return {
		// Check token every N user messages, refresh automatically if expiring
		async "chat.message"(input: { role: string }, _output: unknown) {
			if (input.role !== "user") return;

			messageCount++;
			if (messageCount % CHECK_INTERVAL_MESSAGES !== 0) return;

			try {
				fileLog(`Checking token status (message #${messageCount})`, "debug");
				const status = checkAnthropicToken();

				if (!status.exists) {
					fileLog("No Anthropic OAuth token configured", "debug");
					return;
				}

				if (status.valid && !status.expiresSoon) {
					fileLog("Token valid, no refresh needed", "debug");
					return;
				}

				if (status.expiresSoon || !status.valid) {
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

				if (!status.exists) {
					fileLog("No Anthropic token configured at session start", "debug");
					return;
				}

				if (status.expiresSoon || !status.valid) {
					fileLog("Token expires soon at session start, scheduling refresh", "warn");
					setTimeout(() => {
						if (!isRefreshInProgress()) {
							refreshAnthropicToken()
								.then((success) => {
									if (success) fileLog("Session-start refresh successful", "info");
								})
								.catch((err: unknown) => {
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
		},
	};
}

export default AnthropicTokenBridge;
