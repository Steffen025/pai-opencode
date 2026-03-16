---
title: ADR-010 — Shell.env Hook + .env Two-Layer Environment Variable System
status: Accepted
date: 2026-03-06
tags: [plugin-system, environment-variables, bash-tool, opencode-native, shell-env]
---

# ADR-010: Shell.env Hook + .env — Two-Layer Environment Variable System

**Status:** Accepted  
**Date:** 2026-03-06  
**Decision Owner:** Steffen  
**Context:** WP-A completion + DeepWiki OpenCode research (PR #42)

---

## Context

OpenCode's Bash tool is **stateless** (ADR-008). Every bash call spawns a fresh
shell process. This creates a challenge: how do environment variables (API keys,
runtime context) reach Bash child processes reliably?

Two separate systems need to cooperate:

1. **`.opencode/.env`** — Static secrets (API keys, credentials)
2. **`shell.env` plugin hook** — Dynamic runtime context per bash call

### The Problem Without This Design

```typescript
// Plugin (TypeScript) — process.env works fine
const key = process.env.GOOGLE_API_KEY;  // ✅ Available

// Bash child process — might NOT inherit all vars
Bash({ command: "python3 transcribe.py --key $GOOGLE_API_KEY" })
// ⚠️ GOOGLE_API_KEY may be undefined in child process
```

---

## Decision

**Two-layer architecture — each layer serves a different purpose:**

### Layer 1: `.opencode/.env` → Bun → `process.env`

**Purpose:** Static secrets, API keys, credentials  
**Loaded by:** Bun automatically at startup (no dotenv needed)  
**Available to:** All TypeScript plugin code via `process.env.KEY`  
**Persists:** For entire OpenCode process lifetime

```
.opencode/.env
      │
      │ Bun auto-loads at startup
      ▼
process.env (entire OpenCode process)
      │
      ├─── Plugin TypeScript: process.env.GOOGLE_API_KEY  ✅
      ├─── Plugin TypeScript: process.env.PERPLEXITY_API_KEY  ✅
      └─── Plugin TypeScript: process.env.PAI_OBSERVABILITY_PORT  ✅
```

**What lives in `.env`:**
- API Keys (Google, Perplexity, Cloudflare, R2, ElevenLabs, etc.)
- Service URLs (n8n, ERPNext, Odoo)
- Authentication credentials
- Feature flags (TTS_PROVIDER, GOOGLE_TTS_TIER)
- User config (DA name, TIME_ZONE)

### Layer 2: `shell.env` plugin hook → Bash child processes

**Purpose:** Runtime context (computed per call) + explicit passthrough  
**Runs:** Before EACH bash tool invocation  
**Scope:** Only the spawned bash child process  
**Persists:** Only for that single bash call

```typescript
"shell.env": async (input, output) => {
  output.env = output.env || {};

  // Runtime context (not in .env — computed dynamically)
  output.env["PAI_CONTEXT"] = "1";
  output.env["PAI_SESSION_ID"] = input.sessionID ?? "unknown";
  output.env["PAI_WORK_DIR"] = input.cwd ?? "";
  output.env["PAI_VERSION"] = "3.0";

  // Explicit passthrough for keys that bash scripts need
  const PASSTHROUGH_KEYS = [
    "GOOGLE_API_KEY",      // Transcription scripts
    "TTS_PROVIDER",        // Voice synthesis selector
    "DA",                  // Agent name
    "TIME_ZONE",           // Date formatting in scripts
    "PAI_OBSERVABILITY_PORT",
    "PAI_OBSERVABILITY_ENABLED",
  ];
  for (const key of PASSTHROUGH_KEYS) {
    if (process.env[key]) output.env[key] = process.env[key];
  }
}
```

---

## Architecture Diagram

```
STARTUP:
.opencode/.env ──Bun──> process.env (full OpenCode process)
                              │
                    ┌─────────┴──────────────────┐
                    │                            │
            Plugin TypeScript            Bash Child Process
            (reads directly)         (needs explicit injection)
                    │                            │
            process.env.KEY ✅         shell.env Hook ──> output.env
```

---

## Rules

### When to use `.env`
- API Keys and secrets
- Service endpoints
- Credentials
- Everything a TypeScript plugin needs directly

### When to use `shell.env` hook
- Runtime context only known at call time (session ID, working directory)
- Keys that Bash scripts need AND `process.env` inheritance is unreliable
- PAI context flags (`PAI_CONTEXT`, `PAI_VERSION`)

### What NOT to put in `shell.env`
- All API keys (use `.env` instead — Bun inherits them)
- Secrets that shouldn't be in child process environment
- Large values or binary data

---

## PASSTHROUGH_KEYS Strategy

Not all `process.env` keys are passed through. The `PASSTHROUGH_KEYS` array is
curated to include only keys that:

1. **Bash scripts explicitly need** (not just TypeScript code)
2. **May not be inherited automatically** depending on OpenCode version
3. **Are safe to expose** in child process environment

Add a key to `PASSTHROUGH_KEYS` when:
- A bash script or external tool needs the variable
- The variable is in `.env` but not reaching the script
- After debugging confirms `process.env` inheritance failed

---

## Consequences

### Positive
- **Clear separation of concerns** — secrets in `.env`, context in `shell.env`
- **Non-blocking** — shell.env failures never fail bash calls
- **Explicit passthrough** — only needed keys reach child processes
- **Audit trail** — `fileLog` shows exactly what was injected

### Negative
- **Two systems to maintain** — new keys may need to go in both places
- **Potential duplication** — PASSTHROUGH_KEYS overlaps with `.env`
- **Ordering dependency** — `.env` must exist before shell.env can passthrough

### Mitigations
- PASSTHROUGH_KEYS is documented and minimal
- shell.env fails silently (non-blocking try/catch)
- `.env.example` template documents required keys

---

## Implementation

**Location:** `.opencode/plugins/pai-unified.ts`  
**Hook name:** `"shell.env"`  
**Status:** ✅ Implemented (PR #42, commit 09b80e1)

---

## References

- **ADR-008:** OpenCode Bash workdir Parameter (stateless shell)
- **ADR-001:** Hooks → Plugins Architecture  
- **PR #42:** WP-A completion, shell.env hook added
- **Research:** `docs/epic/OPENCODE-NATIVE-RESEARCH.md` — Section 1 (Bash)
- **OpenCode Source:** `packages/plugin/src/index.ts` — `"shell.env"` hook definition
