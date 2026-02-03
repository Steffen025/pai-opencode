# Cost-Aware Research Skill Pack

**Multi-provider research system with cost transparency and tiered workflows.**

## Value Proposition

- **Quick Research is FREE** — ClaudeResearcher uses Claude WebSearch (included in Anthropic subscription)
- **Clear Cost Tiers** — Know exactly what you'll pay before running expensive research
- **Multi-Provider Coverage** — 6 specialized researchers for comprehensive analysis
- **Confirmation Gate** — Extensive research requires explicit approval (prevents cost surprises)

## Installation

### Option 1: Copy to PAI-OpenCode

```bash
# From PAI-OpenCode root
cp -r skill-packs/cost-aware-research/.opencode/skills/Research .opencode/skills/
cp skill-packs/cost-aware-research/Agents/*.md .opencode/agents/
cp skill-packs/cost-aware-research/.env.example .opencode/
```

### Option 2: Copy to PAI (Claude Code)

```bash
# From your PAI directory
cp -r skill-packs/cost-aware-research/.opencode/skills/Research ~/.claude/skills/
cp skill-packs/cost-aware-research/Agents/*.md ~/.claude/agents/
cp skill-packs/cost-aware-research/.env.example ~/.claude/
```

## Research Tiers

| Tier | Workflow | Agents | Cost | When to Use |
|------|----------|--------|------|-------------|
| **Quick** | `QuickResearch` | 1 Claude | **$0 FREE** | Default for simple queries |
| **Standard** | `StandardResearch` | 3 providers | ~$0.01 | Multiple perspectives needed |
| **Extensive** | `ExtensiveResearch` | 4-5 providers | ~$0.10-0.50 | Deep-dive analysis |

## Researchers

| Agent | Model | Specialty |
|-------|-------|-----------|
| `ClaudeResearcher` | claude-sonnet-4-5 | Academic depth, scholarly sources |
| `GeminiResearcher` | gemini-1.5-pro | Multi-perspective synthesis |
| `GrokResearcher` | grok-4-1-fast | Contrarian analysis, X/Twitter access |
| `PerplexityResearcher` | sonar | Real-time news, breaking events |
| `PerplexityProResearcher` | sonar-pro | Deep investigation (Extensive only) |
| `CodexResearcher` | gpt-4o | Technical research, TypeScript focus |

## API Keys

Copy `.env.example` and fill in your keys:

| Provider | Variable | Where to Get | Cost |
|----------|----------|--------------|------|
| Perplexity | `PERPLEXITY_API_KEY` | perplexity.ai/settings/api | $5/mo includes sonar |
| Google | `GOOGLE_API_KEY` | aistudio.google.com | Free tier available |
| xAI | `XAI_API_KEY` | console.x.ai | ~$0.20/1M tokens |
| OpenAI | `OPENAI_API_KEY` | platform.openai.com | Pay-per-use |
| Claude | (built-in) | — | **FREE** with subscription |

## Usage

```
# Quick (FREE, default)
research latest developments in AI agents

# Standard (~$0.01)
do standard research on multi-agent orchestration

# Extensive (~$0.10-0.50, requires confirmation)
do extensive research on the future of AI-powered productivity
```

## Files Included

```
cost-aware-research/
├── README.md                    # This file
├── SKILL.md                     # Research skill definition
├── .env.example                 # API key template
├── Workflows/
│   ├── QuickResearch.md         # Single Claude, FREE
│   ├── StandardResearch.md      # 3 providers
│   └── ExtensiveResearch.md     # 4-5 providers, cost gate
└── Agents/
    ├── ClaudeResearcher.md
    ├── GeminiResearcher.md
    ├── GrokResearcher.md
    ├── PerplexityResearcher.md
    ├── PerplexityProResearcher.md
    └── CodexResearcher.md
```

## License

MIT — Part of PAI-OpenCode by Steffen Zellmer.
