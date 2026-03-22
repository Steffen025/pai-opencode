// ============================================================
// Anthropic Max Bridge — OpenCode Plugin
// Version: 1.0.0  |  Date: 2026-03-20
// ============================================================
//
// PURPOSE
// -------
// Lets you use your existing Anthropic Max / Pro subscription
// inside OpenCode without paying extra for API keys.
//
// HOW IT WORKS (3 tiny fixes)
// ----------------------------
// When Anthropic blocked OAuth for third-party tools (March 2026),
// they introduced 3 API-level differences vs. API-key auth:
//
//   Fix 1 — system prompt format
//     BAD:  "system": "You are..."            → HTTP 400 Error
//     GOOD: "system": [{"type":"text","text":"..."}]  → HTTP 200 OK
//
//   Fix 2 — OAuth beta header
//     Missing header → HTTP 401 "OAuth authentication not supported"
//     Required:  anthropic-beta: oauth-2025-04-20
//
//   Fix 3 — Bearer token instead of x-api-key
//     Wrong: x-api-key: <token>
//     Right: Authorization: Bearer <token>
//
// TOKEN SOURCE
// ------------
// Tokens live in:  ~/.local/share/opencode/auth.json
// (under the "anthropic" key — see README for how to put them there)
//
// DISCLAIMER
// ----------
// Using OAuth tokens from Claude Code in a third-party tool
// may violate Anthropic's Terms of Service.
// Use at your own risk.
// ============================================================

export async function AnthropicMaxBridgePlugin() {
	return {
		// ── Fix 1 ──────────────────────────────────────────────────
		// Convert system prompt strings to the array-of-objects format
		// that the OAuth endpoint requires.
		async "experimental.chat.system.transform"(input, output) {
			if (input.model?.providerID !== "anthropic") return;

			// Normalise output.system to an array before mapping so we never
			// call .map() on undefined, null, or a bare string/object.
			if (!Array.isArray(output.system)) {
				if (output.system === undefined || output.system === null) {
					output.system = [];
				} else {
					// Single string or single object — wrap it
					output.system = [output.system];
				}
			}

			output.system = output.system.map((s) =>
				typeof s === "string" ? { type: "text", text: s } : s,
			);
		},

		// ── Auth provider ──────────────────────────────────────────
		auth: {
			provider: "anthropic",

			async loader(getAuth, provider) {
				const auth = await getAuth();

				// Only activate for OAuth tokens (not plain API keys)
				if (auth.type !== "oauth") return {};

				// Show $0 cost in the model picker (Max = unlimited)
				for (const model of Object.values(provider.models)) {
					model.cost = { input: 0, output: 0, cache: { read: 0, write: 0 } };
				}

				return {
					apiKey: "", // Not used — Bearer token replaces this

					// ── Fixes 2 & 3 applied to every API request ──────────
					async fetch(input, init) {
						const currentAuth = await getAuth();
						if (currentAuth.type !== "oauth") return fetch(input, init);

						const req = init ?? {};

						// Merge all existing headers
						const headers = new Headers(
							input instanceof Request ? input.headers : undefined,
						);
						new Headers(req.headers).forEach((v, k) => headers.set(k, v));

						// Fix 2: Add OAuth beta header (merge with any existing betas)
						const existing = headers.get("anthropic-beta") || "";
						const betas = new Set([
							"oauth-2025-04-20",
							...existing
								.split(",")
								.map((b) => b.trim())
								.filter(Boolean),
						]);
						headers.set("anthropic-beta", [...betas].join(","));

						// Fix 3: Bearer token instead of x-api-key
						headers.set("authorization", `Bearer ${currentAuth.access}`);
						headers.delete("x-api-key");

						return fetch(input, { ...req, headers });
					},
				};
			},

			// Auth method shown in /connect anthropic
			methods: [
				{
					// Primary method — token comes from auth.json (see README)
					label: "Claude Pro/Max (OAuth)",
					type: "oauth",
			authorize: async () => {
					// INTENTIONAL: This OAuth authorize flow is deliberately disabled.
					// Tokens are NOT obtained through a browser redirect here.
					// Instead, they are extracted from the macOS Keychain (where
					// Claude Code CLI stores them) and written to auth.json by the
					// PAI-OpenCode installer or the refresh script.
					// The plugin only reads from auth.json — it never triggers its own
					// OAuth flow.
					return { type: "failed" };
				},
				},
				{
					// Fallback — standard API key still works
					label: "API Key",
					type: "api",
				},
			],
		},
	};
}

export default AnthropicMaxBridgePlugin;
