# Advanced PAI-OpenCode Setup



## Overview

The installer configures Zen free as the default provider. Connecting additional providers and updating agent model assignments are **post-install steps** — see [INSTALL.md — Connecting Premium Providers](../INSTALL.md#connecting-premium-providers) for the two-step process (`/connect` → `switch-provider`).

> **Anthropic Claude Max note:** Routing a Claude Max subscription through OpenCode via OAuth requires a community plugin that PAI-OpenCode intentionally does not ship ([details in INSTALL.md](../INSTALL.md#️-anthropic-claude-max--important-note)). The ToS-safe alternative is an Anthropic API key or OpenCode Zen paid.

## Custom Model Configuration

### Understanding the Agent Config
The `opencode.json` file contains an `agent` section where you can define which model each specialized agent uses. Each agent has exactly one model configured.

- `model` — The model used for all tasks assigned to this agent.

### Custom Model Selection
You can edit `opencode.json` directly to change which model any agent uses. This lets you mix providers and make cost/quality tradeoffs by choosing the right model per agent.

**Example Configuration:**
```json
"Engineer": {
  "model": "anthropic/claude-sonnet-4-5"
}
```

For cost optimization, use agent-based routing: assign lightweight agents (like `explore` or `Intern`) to simple tasks and heavier agents (like `Architect` or `Algorithm`) to complex work.

### Using the Provider Switch Tool
PAI-OpenCode includes a utility to quickly switch between different provider profiles across all agents.

```bash
# Switch all agents to Anthropic models
bun run .opencode/tools/switch-provider.ts anthropic

# Switch to the ZEN PAID profile
bun run .opencode/tools/switch-provider.ts zen-paid

# List all available profiles
bun run .opencode/tools/switch-provider.ts --list

# Show the current configuration
bun run .opencode/tools/switch-provider.ts --current
```

## Multi-Provider Research

### What It Is
One of the most powerful features of PAI-OpenCode is the ability to use diverse perspectives for research. Instead of routing all research through a single provider, you can configure research agents to use their "native" providers.

- **GeminiResearcher** → Powered by Google Gemini
- **GrokResearcher** → Powered by xAI Grok
- **PerplexityResearcher** → Powered by Perplexity Sonar
- **CodexResearcher** → Powered by OpenRouter (specialized coding models)

### How to Set Up
1. Obtain API keys from each respective provider.
2. Add the keys to your `~/.opencode/.env` file:
   ```env
   GOOGLE_API_KEY=your_key_here
   XAI_API_KEY=your_key_here
   PERPLEXITY_API_KEY=your_key_here
   OPENROUTER_API_KEY=your_key_here
   ```
3. Activate multi-provider research:
   ```bash
   bun run .opencode/tools/switch-provider.ts anthropic --multi-research
   ```
4. Verify the setup:
   ```bash
   bun run .opencode/tools/switch-provider.ts --researchers
   ```

### How It Works
The system is designed to be resilient. If a provider's API key is missing from your `.env` file, that specific researcher will automatically fall back to your primary provider (e.g., Anthropic). This ensures that research tasks always complete, even if you don't have accounts with every provider.

## Other Providers (OpenAI, Google, Local)

### OpenAI
If you prefer the GPT ecosystem, you can switch your entire infrastructure to OpenAI models.
- **Profile:** `.opencode/profiles/openai.yaml`
- **Requirement:** `OPENAI_API_KEY` in `.env` (or a ChatGPT Plus subscription linked via OAuth)
- **Switch:** `bun run .opencode/tools/switch-provider.ts openai`

### Local (Ollama)
For maximum privacy and offline capability, you can run PAI-OpenCode against local models.
- **Profile:** `.opencode/profiles/local.yaml`
- **Requirement:** Ollama installed and running locally with models already pulled.
- **Switch:** `bun run .opencode/tools/switch-provider.ts local`
- **Note:** You may need to customize `local.yaml` to match the specific model names you have installed in Ollama (e.g., `llama3.1:8b`, `qwen2.5-coder:7b`).

## Creating Custom Profiles

You can create your own provider profiles by adding a YAML file to `.opencode/profiles/custom.yaml`. Follow the structure of the existing profiles:

```yaml
name: My Custom Setup
description: Optimized for speed using a mix of providers
default_model: opencode/glm-4.7
agents:
  Algorithm:
    model: anthropic/claude-opus-4-6
  Engineer:
    model: opencode/kimi-k2.5
  # ... add other agent overrides here
```

## Agent Reference

PAI-OpenCode utilizes 16 specialized agents to handle different aspects of your work.

| Agent | Type | Purpose |
|-------|------|---------|
| **Algorithm** | Orchestrator | Main reasoning engine, creates ISC criteria, and manages Algorithm phases. |
| **Architect** | System Design | Handles system architecture, specifications, and implementation plans. |
| **Engineer** | Implementation | Expert in TDD, code implementation, refactoring, and bug fixes. |
| **general** | Custom Agent | Used for dynamic agent composition based on specific trait requirements. |
| **explore** | Codebase Search | Specialized in fast file discovery and codebase pattern matching. |
| **Intern** | Grunt Work | Handles parallel tasks and simple, mechanical operations. |
| **Writer** | Content | Professional technical writing, blog posts, and documentation. |
| **DeepResearcher** | Research | The default researcher for general web search and information gathering. |
| **GeminiResearcher** | Research | Uses Google Gemini for multi-perspective analysis and creative synthesis. |
| **GrokResearcher** | Research | Uses xAI Grok for contrarian analysis and social media research. |
| **PerplexityResearcher** | Research | Uses Perplexity Sonar for real-time web search and current events. |
| **CodexResearcher** | Research | Focuses on deep technical research using specialized coding models. |
| **QATester** | QA | Methodical verification of functionality through testing and browser automation. |
| **Pentester** | Security | Performs vulnerability assessments and security audits. |
| **Designer** | Design | Specialized in UX/UI design, Figma integration, and shadcn/ui. |
| **Artist** | Visual | Expert at image generation and creating visual content. |

## Troubleshooting

### Config Not Applying
If you manually edit `opencode.json` and don't see changes, ensure the JSON is valid. OpenCode will revert to defaults if it cannot parse the configuration.

### Subagent Failures
If a specific agent fails to start, check if the configured model is available through your provider. Some models (like Opus 4.6) may require specific subscription tiers or API permissions.

### Caching Issues
Provider-level caching (like Anthropic's prompt caching) is managed automatically by PAI-OpenCode. If you experience unexpected behavior, you can disable caching in the `provider` section of `opencode.json`.

---
*Professional, clean, and optimized for PAI-OpenCode power users.*
