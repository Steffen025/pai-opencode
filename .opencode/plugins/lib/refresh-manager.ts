import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { error, info, warn } from "./file-logger.ts";
import { updateAnthropicTokens } from "./token-utils.ts";

const EXEC_TIMEOUT_MS = 15_000; // 15 seconds — prevents execCommand hanging indefinitely

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const AUTH_FILE = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");

let isRefreshing = false;
let lastRefreshAttempt = 0;

function getExistingRefreshToken(): string | null {
	try {
		const content = fs.readFileSync(AUTH_FILE, "utf8");
		const auth = JSON.parse(content) as {
			anthropic?: { refresh?: string; type?: string };
		};
		if (auth.anthropic?.type === "oauth" && auth.anthropic.refresh) {
			return auth.anthropic.refresh;
		}
		return null;
	} catch {
		return null;
	}
}

export function isRefreshInProgress(): boolean {
	if (isRefreshing) return true;
	return Date.now() - lastRefreshAttempt < REFRESH_COOLDOWN_MS;
}

interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

function execCommand(command: string, args: string[]): Promise<ExecResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args);
		let stdout = "";
		let stderr = "";
		let settled = false;

		const settle = (result: ExecResult) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(result);
		};

		const timer = setTimeout(() => {
			child.kill();
			settle({ stdout, stderr: "timeout", exitCode: 1 });
		}, EXEC_TIMEOUT_MS);

		child.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString();
		});
		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});
		child.on("close", (exitCode: number | null) => {
			settle({ stdout, stderr, exitCode: exitCode ?? 0 });
		});
		child.on("error", (err: Error) => {
			settle({ stdout, stderr: String(err), exitCode: 1 });
		});
	});
}

interface KeychainTokens {
	accessToken: string;
	refreshToken: string;
}

async function extractFromKeychain(): Promise<KeychainTokens | null> {
	try {
		const { stdout, exitCode } = await execCommand("security", [
			"find-generic-password",
			"-s",
			"Claude Code-credentials",
			"-w",
		]);

		if (exitCode !== 0) {
			error("Failed to extract from Keychain", { exitCode, stderr: stdout });
			return null;
		}

		const credentials = JSON.parse(stdout.trim()) as {
			claudeAiOauth?: {
				accessToken?: string;
				refreshToken?: string;
				expiresAt?: number;
			};
			// Legacy fallback for direct storage (rare)
			accessToken?: string;
			refreshToken?: string;
			access_token?: string;
			refresh_token?: string;
		};

		// Extract from nested claudeAiOauth structure (standard Claude Code format)
		const oauth = credentials.claudeAiOauth;
		// pragma: allowlist secret — runtime extraction from macOS Keychain
		const accessToken = oauth?.accessToken ?? credentials.accessToken ?? credentials.access_token;
		const refreshToken = oauth?.refreshToken ?? credentials.refreshToken ?? credentials.refresh_token;

		if (!accessToken || !refreshToken) {
			error("Invalid credentials format from Keychain", {
				hasAccess: !!accessToken,
				hasRefresh: !!refreshToken,
			});
			return null;
		}

		return { accessToken, refreshToken };
	} catch (err) {
		error("Exception extracting from Keychain", { error: String(err) });
		return null;
	}
}

async function generateSetupToken(): Promise<string | null> {
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

interface OAuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

const ANTHROPIC_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const ANTHROPIC_TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";

async function refreshWithOAuthToken(existingRefreshToken: string, attempt = 1): Promise<OAuthTokens | null> {
	const MAX_RETRIES = 3;
	const BASE_DELAY_MS = 2000; // Start with 2 second delay

	try {
		info(`Refreshing OAuth token via Anthropic token endpoint (attempt ${attempt}/${MAX_RETRIES})`);

		// AbortController timeout to prevent hanging
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		// OAuth2 refresh token flow
		// Note: Do NOT include scope parameter - Anthropic rejects it on refresh
		const params = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: existingRefreshToken,
			client_id: ANTHROPIC_OAUTH_CLIENT_ID,
		});

		const response = await fetch(ANTHROPIC_TOKEN_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"anthropic-version": "2023-06-01",
				"User-Agent": "claude-cli/2.0 (OpenCode Token Bridge)",
			},
			body: params.toString(),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const errorText = await response.text();
			const errorData = JSON.parse(errorText) as { error?: { type?: string; message?: string } };

			// Handle rate limiting with exponential backoff
			if (response.status === 429 && attempt < MAX_RETRIES) {
				const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 2s, 4s, 8s
				warn(`OAuth refresh rate limited (429), retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, delayMs));
				return refreshWithOAuthToken(existingRefreshToken, attempt + 1);
			}

			// Handle invalid_grant (refresh token revoked/expired) - don't retry
			if (errorData.error?.type === "invalid_grant") {
				error("OAuth refresh failed - refresh token invalid or revoked", { status: response.status, error: errorText });
				return null;
			}

			error("OAuth refresh failed", { status: response.status, error: errorText });
			return null;
		}

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
		};

		if (!data.access_token || !data.refresh_token) {
			error("Invalid OAuth refresh response", {
				hasAccess: !!data.access_token,
				hasRefresh: !!data.refresh_token,
			});
			return null;
		}

		info("OAuth refresh successful - received new access and refresh tokens");
		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in ?? 28800,
		};
	} catch (err) {
		// Network errors - retry with backoff
		if (attempt < MAX_RETRIES) {
			const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
			warn(`OAuth refresh network error, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`, { error: String(err) });
			await new Promise(resolve => setTimeout(resolve, delayMs));
			return refreshWithOAuthToken(existingRefreshToken, attempt + 1);
		}
		error("Exception during OAuth refresh (max retries exceeded)", { error: String(err) });
		return null;
	}
}

async function exchangeSetupToken(setupToken: string): Promise<OAuthTokens | null> {
	try {
		info("Exchanging setup token for OAuth credentials");
		const response = await fetch("https://api.anthropic.com/v1/oauth/setup_token/exchange", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${setupToken}`,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({ grant_type: "setup_token" }),
		});

		if (!response.ok) {
			error("Token exchange failed", { status: response.status });
			return null;
		}

		const data = (await response.json()) as {
			access_token?: string;
			refresh_token?: string;
			expires_in?: number;
		};

		if (!data.access_token || !data.refresh_token) {
			error("Invalid exchange response", {
				hasAccess: !!data.access_token,
				hasRefresh: !!data.refresh_token,
			});
			return null;
		}

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in ?? 28800,
		};
	} catch (err) {
		error("Exception exchanging setup token", { error: String(err) });
		return null;
	}
}

export async function refreshAnthropicToken(): Promise<boolean> {
	if (isRefreshing) {
		info("Refresh already in progress, skipping");
		return false;
	}

	const timeSinceLastAttempt = Date.now() - lastRefreshAttempt;
	if (timeSinceLastAttempt < REFRESH_COOLDOWN_MS) {
		info("Refresh on cooldown", {
			minutesRemaining: Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastAttempt) / 60000),
		});
		return false;
	}

	isRefreshing = true;
	lastRefreshAttempt = Date.now();

	try {
		info("Starting token refresh process");

		// Strategy 1: Use existing refresh_token to get new tokens via OAuth API
		// This is the proper OAuth2 flow and should work silently without browser
		const existingRefreshToken = getExistingRefreshToken();
		if (existingRefreshToken) {
			info("Attempting OAuth refresh with existing refresh_token");
			const refreshedTokens = await refreshWithOAuthToken(existingRefreshToken);
			if (refreshedTokens) {
				const success = updateAnthropicTokens(
					refreshedTokens.accessToken,
					refreshedTokens.refreshToken,
					refreshedTokens.expiresIn,
				);
				if (success) {
					info("Token refresh successful via OAuth refresh_token API");
					return true;
				}
			}
			info("OAuth refresh failed, falling back to Keychain");
		} else {
			info("No existing refresh_token found, skipping OAuth refresh");
		}

		// Strategy 2: Extract from macOS Keychain (Claude Code may have fresh tokens)
		const keychainTokens = await extractFromKeychain();
		if (keychainTokens) {
			info("Found tokens in Keychain, updating auth.json");
			const success = updateAnthropicTokens(
				keychainTokens.accessToken,
				keychainTokens.refreshToken,
				28800,
			);
			if (success) {
				info("Token refresh successful via Keychain");
				return true;
			}
		}

		// Strategy 3: Generate new setup token via Claude Code CLI (may trigger browser)
		info("Keychain extraction failed, generating new setup token");
		const setupToken = await generateSetupToken();
		if (!setupToken) {
			error("Failed to generate setup token - is Claude Code authenticated?");
			return false;
		}

		// Strategy 3: Exchange setup token for OAuth credentials
		// (numbered 3 here because Strategy 1=OAuth refresh, Strategy 2=Keychain)
		const oauthTokens = await exchangeSetupToken(setupToken);
		if (!oauthTokens) {
			error("Failed to exchange setup token");
			return false;
		}

		const success = updateAnthropicTokens(
			oauthTokens.accessToken,
			oauthTokens.refreshToken,
			oauthTokens.expiresIn,
		);
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
