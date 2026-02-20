# Known Limitations (v2.0.0)

This document lists features from upstream PAI that are not portable to OpenCode, limitations of the current implementation, and optional features.

---

## Not Portable (Claude Code Only)

These features exist in Daniel Miessler's PAI but depend on Claude Code-specific APIs that have no OpenCode equivalent:

### Agent Teams / Swarm
- **Upstream:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enables coordinated multi-agent with shared task lists
- **OpenCode:** No equivalent experimental API. Use the standard Task tool for parallel agent spawning instead.
- **Workaround:** Launch multiple Task tool calls in a single message for parallel execution

### Plan Mode
- **Upstream:** `EnterPlanMode` / `ExitPlanMode` built-in tools provide structured read-only exploration with approval checkpoint
- **OpenCode:** No equivalent built-in tools. The PLAN phase still runs — it just doesn't have the structured workshop.
- **Workaround:** Perform equivalent exploration using Glob, Grep, Read directly in the conversation flow

### StatusLine
- **Upstream:** Real-time status display in Claude Code UI showing current phase, criteria progress, etc.
- **OpenCode:** No TUI status line API. Phase progression is tracked via voice curls and Algorithm output.
- **Status:** Investigating potential OpenCode TUI extensions

### Model Tiers Require Dev Build
- **Limitation:** `model_tiers` configuration in `opencode.json` requires OpenCode dev build (PR #11377)
- **Stable releases:** Only support the default `model` field per agent (no dynamic tier routing)
- **Workaround:** Use default models per agent, or build from source with the feature branch

---

## v2.0.0 Specific

### Voice Curl Template Variables
- **Situation:** Algorithm v1.8.0 voice curls use `{DAIDENTITY.ALGORITHMVOICEID}` template variable
- **OpenCode behavior:** The template variable appears as literal text in the SKILL.md since OpenCode doesn't have a build system like `CreateDynamicCore.ts` in the upstream PAI
- **Impact:** Voice phase announcements work — the AI reads the literal string and resolves it from DAIDENTITY context at runtime
- **Note:** If you customize your fork with a build system (like jeremy-opencode does), the variable resolves at build time

### Prompt Caching
- **Upstream:** Claude Code uses Anthropic's prompt caching natively for SKILL.md and context files
- **OpenCode:** Zen provider has automatic similarity-based caching (70-90% hit rate, 5min TTL). Anthropic direct requires manual `cache_control` in API calls.
- **Impact:** Token costs may be slightly higher without explicit caching on Anthropic provider

---

## Optional Features (Not Required)

### Skill Customizations
- System exists at `.opencode/skills/CORE/USER/SKILLCUSTOMIZATIONS/`
- Not populated by default — skills work without customizations
- **Setup:** Create customization files as needed per skill

### Voice Server
- Voice notifications work with multiple backends:
  - ElevenLabs via Voice Server (if running on localhost:8888)
  - Google Cloud TTS (if credentials configured)
  - macOS `say` command (automatic fallback)
- **All fallbacks are graceful** — no errors if services unavailable

### Wisdom Frames
- 5 seed domain frames shipped (development, deployment, security, architecture, communication)
- The Algorithm reads and writes to these automatically
- **Optional:** Add custom domain frames to `MEMORY/WISDOM/` for your specific work domains

### Observability Dashboard
- Event logging to `/tmp/pai-opencode-debug.log` works
- Vue 3 dashboard available but deprecated (significant dependency overhead)
- Server-side JSONL event logging remains unaffected

---

## Working in v2.0.0

### Core Systems
- [x] Core plugin system (auto-discovery, no config needed)
- [x] 39 skills functional
- [x] TELOS/USER context loading
- [x] Security validation on tool execution
- [x] Memory structure with Wisdom Frames
- [x] Skill routing and execution
- [x] 3 Provider Presets (zen-paid, openrouter, local-ollama)
- [x] Dynamic per-task model tier routing (dev build)

### PAI v3.0 / Algorithm v1.8.0
- [x] Full 7-phase Algorithm (OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN)
- [x] 8 Effort Levels (Instant, Fast, Standard, Extended, Advanced, Deep, Comprehensive, Loop)
- [x] Verify Completion Gate — mandatory reconciliation before LEARN
- [x] Constraint Extraction System with [EX-N] labels
- [x] Wisdom Frames — domain knowledge read/write cycle
- [x] Zero-Delay Output — visible tokens within 10 seconds
- [x] 25-Capability Full Scan Audit
- [x] 7 Quality Gates (QG1-QG7)
- [x] PRD System — persistent requirements documents
- [x] Build Drift Prevention — ISC Adherence Check + Constraint Checkpoint
- [x] Mechanical Verification — no rubber-stamp PASS
- [x] Algorithm Reflection JSONL — structured learning capture
- [x] Phase Separation Enforcement
- [x] Self-Interrogation with effort scaling
- [x] ISC Scale Tiers (Simple 4-16, Medium 17-32, Large 33-99, Massive 100-500+)

### Plugin Handlers (20 total)
- [x] `context-loader.ts` — CORE context injection
- [x] `security-validator.ts` — Dangerous command blocking + env var prefix stripping
- [x] `rating-capture.ts` — User rating capture with 5/10 noise filter
- [x] `isc-validator.ts` — ISC criteria validation
- [x] `learning-capture.ts` — Learning to MEMORY
- [x] `work-tracker.ts` — Work session tracking
- [x] `skill-restore.ts` — Skill context restore
- [x] `agent-capture.ts` — Agent output capture
- [x] `voice-notification.ts` — TTS notifications
- [x] `implicit-sentiment.ts` — Sentiment detection
- [x] `tab-state.ts` — Kitty tab updates
- [x] `update-counts.ts` — Skill/workflow counting
- [x] `response-capture.ts` — ISC tracking
- [x] `observability-emitter.ts` — Event emission
- [x] `format-reminder.ts` — 8-tier effort level detection
- [x] `algorithm-tracker.ts` — Phase transition monitoring
- [x] `agent-execution-guard.ts` — Agent invocation validation
- [x] `skill-guard.ts` — Skill prerequisite enforcement
- [x] `check-version.ts` — Algorithm version compatibility
- [x] `integrity-check.ts` — Session-end validation

---

## Troubleshooting

### Plugin not loading?
```bash
# Check plugin log
tail -f /tmp/pai-opencode-debug.log

# Verify plugin exists
ls -la .opencode/plugins/pai-unified.ts
```

### Context not injected?
```bash
# Check context files exist
ls -la .opencode/skills/CORE/USER/TELOS/
ls -la .opencode/skills/CORE/USER/DAIDENTITY.md
```

### Voice notifications not working?
Voice notifications are optional and fail gracefully if:
- Voice Server not running on localhost:8888
- Google Cloud TTS not configured
- Not on macOS (for `say` fallback)

```bash
grep -i voice /tmp/pai-opencode-debug.log
```

### Security validator blocking legitimate commands?
The security validator blocks dangerous patterns by design. In v2.0.0, it also strips env var prefixes (`export`, `set`, `declare`, `readonly`) before scanning to prevent false positives.

---

*Last updated: 2026-02-19*
*Version: 2.0.0*
