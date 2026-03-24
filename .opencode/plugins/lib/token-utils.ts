import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { error, info, warn } from "./file-logger.ts";

const AUTH_FILE = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour - refresh when < 60 min remaining (proactive)

export interface TokenStatus {
	valid: boolean;
	exists: boolean;
	expiresSoon: boolean;
	timeRemainingMs: number;
	expiresAt?: Date;
	maskedAccess?: string;
	reason: string;
}

interface AuthFile {
	anthropic?: {
		type: string;
		access?: string;
		refresh?: string;
		expires?: number;
	};
	[key: string]: unknown;
}

function readAuthFile(): AuthFile | null {
	try {
		const content = fs.readFileSync(AUTH_FILE, "utf8");
		return JSON.parse(content) as AuthFile;
	} catch (err) {
		error("Failed to read auth.json", { error: String(err) });
		return null;
	}
}

function writeAuthFile(authData: AuthFile): boolean {
	try {
		fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2) + "\n");
		return true;
	} catch (err) {
		error("Failed to write auth.json", { error: String(err) });
		return false;
	}
}

export function maskToken(token: string | undefined): string {
	if (!token || token.length < 20) return "***";
	return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export function checkAnthropicToken(): TokenStatus {
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
			maskedAccess: maskToken(anthropic.access),
		};
	}

	const now = Date.now();
	const expires = anthropic.expires ?? 0;
	const timeRemainingMs = expires - now;

	if (timeRemainingMs <= 0) {
		warn("Anthropic token expired", {
			expiredAt: new Date(expires).toISOString(),
			maskedAccess: maskToken(anthropic.access),
		});
		return {
			valid: false,
			exists: true,
			expiresSoon: true,
			timeRemainingMs: 0,
			expiresAt: new Date(expires),
			maskedAccess: maskToken(anthropic.access),
			reason: "token_expired",
		};
	}

	const expiresSoon = timeRemainingMs < REFRESH_THRESHOLD_MS;
	const hoursRemaining = Math.floor(timeRemainingMs / (60 * 60 * 1000));

	if (expiresSoon) {
		warn("Anthropic token expires soon", {
			hoursRemaining,
			expiresAt: new Date(expires).toISOString(),
			maskedAccess: maskToken(anthropic.access),
		});
	} else {
		info("Anthropic token valid", {
			hoursRemaining,
			expiresAt: new Date(expires).toISOString(),
		});
	}

	return {
		valid: true,
		exists: true,
		expiresSoon,
		timeRemainingMs,
		expiresAt: new Date(expires),
		maskedAccess: maskToken(anthropic.access),
		reason: expiresSoon ? "expires_soon" : "valid",
	};
}

export function updateAnthropicTokens(
	accessToken: string,
	refreshToken: string,
	expiresInSeconds: number,
): boolean {
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
		expires: expiresAt,
	};

	const success = writeAuthFile(auth);
	if (success) {
		info("Updated anthropic tokens", {
			expiresAt: new Date(expiresAt).toISOString(),
			maskedAccess: maskToken(accessToken),
		});
	}
	return success;
}
