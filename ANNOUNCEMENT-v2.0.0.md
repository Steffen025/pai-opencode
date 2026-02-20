# PAI-OpenCode v2.0.0: The Algorithm Learns to Learn

**TL;DR**: PAI-OpenCode v2.0.0 ports Daniel Miessler's Algorithm v1.8.0, adding mechanical verification that prevents hallucinated completion, constraint extraction that preserves specific requirements through the build process, and wisdom frames that accumulate domain knowledge across sessions. The Algorithm now learns from its mistakes and applies those learnings to future tasks. Provider-agnostic (75+ AI providers), MIT licensed, works on your infrastructure.

---

If you've tried AI assistants that claim "all tests passing" without actually running tests, or watched specific requirements dissolve into vague criteria, you've hit the two failure modes that v2.0.0 was built to eliminate.

## What is PAI-OpenCode?

PAI-OpenCode is a port of Daniel Miessler's [Personal AI Infrastructure (PAI)](https://github.com/danielmiessler/Personal_AI_Infrastructure) to [OpenCode](https://github.com/anomalyco/opencode), making it provider-agnostic and adding dynamic per-task model routing. It's an AI orchestration system that treats problem-solving as hill-climbing from Current State to Ideal State through mechanically verifiable criteria.

The core is the **Algorithm**: a 7-phase loop (OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN) that creates Ideal State Criteria during OBSERVE, evolves them through THINK/PLAN as understanding deepens, and uses them as mechanical verification targets during VERIFY.

## What's New in v2.0.0

**Verify Completion Gate** — The model can no longer say "verified" in prose without actually calling `TaskUpdate(completed)`. Before entering LEARN, the Algorithm reconciles TaskList against all passing criteria. If you claimed PASS but didn't fire the tool call, the gate blocks. This single change eliminates false verification.

**Constraint Extraction System** — During OBSERVE, the Algorithm mechanically extracts every constraint from your request with numbered `[EX-N]` labels. These stay verbatim through ISC creation. If the source says "don't exceed 15 damage," the ISC criterion must say "15 damage" — not "don't be overwhelming." The Coverage Map ensures every `[EX-N]` maps to at least one ISC criterion.

**Wisdom Frames** — The Algorithm now reads from domain-specific wisdom files (`MEMORY/WISDOM/development.md`, `security.md`, etc.) during OBSERVE and writes learnings back during LEARN. Your past mistakes become future guardrails. Low sentiment ratings + substantive Q2 answers (from Algorithm Reflection) signal high-quality improvement opportunities.

**8 Effort Levels** — Granular control from Instant (<10s) to Comprehensive (<120min). Features scale: Fast effort gets one-line capability audit, Extended+ gets full matrix with ISC improvement analysis. Time checks at every phase trigger auto-compression if you exceed budget.

**25-Capability Full Scan** — Every task evaluates all 25 capabilities across 6 sections (Foundation, Thinking, Agents, Collaboration, Execution, Verification). The audit must show "Scan: 25/25" before proceeding. ISC-First Selection asks "which capabilities improve criteria?" before "which capabilities do work?"

## Why This Matters

Most AI coding assistants are stateless — they don't learn from session to session. PAI-OpenCode now accumulates wisdom across time. If you repeatedly hit the same edge case, the Algorithm captures it as a wisdom frame observation and applies it proactively to future similar work.

The Constraint Extraction System solves the abstraction gap that plagues agentic systems: you give specific requirements, the agent builds something that *feels* right but violates your actual constraints. Now those constraints stay mechanically testable from request → ISC → verification.

## Provider Flexibility

PAI on Claude Code = Anthropic only. PAI-OpenCode = 75+ providers via Vercel AI SDK. Same agent, different models based on task complexity:
- `quick` tier: GLM 4.7, Qwen3, MiniMax (cheap, fast)
- `standard` tier: Your configured defaults
- `advanced` tier: Claude Opus 4.6, GPT-4.5 (expensive, powerful)

Pay exactly what the task requires.

## Try It

```bash
git clone https://github.com/Steffen025/pai-opencode
cd pai-opencode
bun install
bun run .opencode/PAIOpenCodeWizard.ts
opencode
```

Choose a provider preset (`zen-paid`, `openrouter`, `local-ollama`), configure your API keys, and you're running.

## What Didn't Change

Stability: All 39 skills, 16 agents, 3 provider presets, and 20 plugin handlers still work unchanged. This is a quality upgrade, not a rewrite.

## Get Involved

- **GitHub**: https://github.com/Steffen025/pai-opencode
- ⭐ **Star** if you find it useful
- **Issues/Discussions** for questions or contributions
- **MIT License** — fork it, extend it, make it yours

The Algorithm v1.8.0 represents 14 upstream commits ported from Daniel Miessler's PAI system. If you want AI infrastructure that learns, verifies mechanically, and works with any provider, this is the release.

---

**Credits**: [Daniel Miessler](https://github.com/danielmiessler) (PAI design), [Anomaly](https://github.com/anomalyco/opencode) (OpenCode platform), [Steffen025](https://github.com/Steffen025) (PAI-OpenCode port).
