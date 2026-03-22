import { spawn } from "node:child_process";
import { error, info } from "./file-logger.ts";
import { updateAnthropicTokens } from "./token-utils.ts";

const EXEC_TIMEOUT_MS = 15_000; // 15 seconds — prevents execCommand hanging indefinitely

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

let isRefreshing = false;
let lastRefreshAttempt = 0;

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
	expiresAt?: number;
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

		const expiresAt = oauth?.expiresAt;
		return { accessToken, refreshToken, expiresAt };
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

async function exchangeSetupToken(setupToken: string): Promise<OAuthTokens | null> {
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
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({ grant_type: "setup_token" }),
			signal: controller.signal,
		});
		
		clearTimeout(timeout);

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

		// Strategy 1: Extract from macOS Keychain
		const keychainTokens = await extractFromKeychain();
		if (keychainTokens) {
			info("Found tokens in Keychain, updating auth.json");
			
			// Calculate expiresInSeconds - only use Keychain expiry if it's valid and in the future
			let expiresInSeconds: number;
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
				const success = updateAnthropicTokens(
					keychainTokens.accessToken,
					keychainTokens.refreshToken,
					expiresInSeconds,
				);
				if (success) {
					info("Token refresh successful via Keychain");
					return true;
				}
			}
		}

		// Strategy 2: Generate new setup token via Claude Code CLI
		info("Keychain extraction failed, generating new setup token");
		const setupToken = await generateSetupToken();
		if (!setupToken) {
			error("Failed to generate setup token - is Claude Code authenticated?");
			return false;
		}

		// Strategy 3: Exchange setup token for OAuth credentials
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
