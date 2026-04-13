# Installation Guide

This guide will help you install PAI OpenCode in under 5 minutes.

![Installation Flow](docs/images/installation-flow.jpg)

---

## Prerequisites

Before running the installer, ensure you have:

1. **Git** — For cloning the repository
   - macOS: `brew install git`
   - Linux: `sudo apt install git`
   - Usually pre-installed on most systems

2. **Bun** (1.3.9+) — JavaScript/TypeScript runtime used by PAI-OpenCode's tooling
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
   > [!NOTE]
   > Bun 1.3.9+ is required only for PAI-OpenCode's own tooling (installer, plugins, skills, MCP servers). It is **not** used to compile OpenCode itself — since v3.0, PAI-OpenCode ships against vanilla OpenCode from `opencode.ai`, which provides its own pre-built binary.
   >
   > Check your version with `bun --version` and upgrade with `bun upgrade` if needed.

---

## Quick Install (Recommended)

```bash
# 1. Clone PAI-OpenCode
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 2. Run the interactive installer wizard
bash PAI-Install/install.sh

# Optional: show bootstrap help
bash PAI-Install/install.sh --help

# Optional: headless install for scripts/CI
bash PAI-Install/install.sh --headless --preset zen --name "Your Name" --ai-name "Jeremy"

# 3. Start OpenCode
opencode
```

The installer will:
1. ✅ Check prerequisites (git, bun 1.3.9+)
2. ✅ **Install vanilla OpenCode** from opencode.ai
3. ✅ Uses OpenCode Zen free models by default — no API key required. To connect premium providers after install, run `/connect` inside OpenCode.
4. ✅ Set up your identity (name, AI assistant name, timezone)
5. ✅ Generate all configuration files

**Takes ~2-3 minutes.**

---

## Existing OpenCode Users

Already have OpenCode with `~/.opencode`? PAI-OpenCode uses a symlink approach so your config lives in a git repo:

```bash
# 1. Clone PAI-OpenCode
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 2. Back up your existing config
mv ~/.opencode ~/.opencode.backup

# 3. Symlink PAI-OpenCode to your home directory
ln -s $(pwd)/.opencode ~/.opencode

# 4. Run the installer (works in place)
bash PAI-Install/install.sh

# 5. Start OpenCode
opencode
```

**Why symlink?** Your config lives in a repo you control. Upgrades are just `git pull`. Rollback is switching the symlink back.

**Want to restore your old config?**
```bash
rm ~/.opencode
mv ~/.opencode.backup ~/.opencode
```

---

## Windows Installation (WSL)

**Native Windows is not yet supported.** Windows users can run PAI-OpenCode through WSL2 (Windows Subsystem for Linux).

### Why WSL?

PAI-OpenCode uses Unix-style paths and tools that don't work natively on Windows. WSL2 provides a full Linux environment where everything works out of the box.

### Step 1: Install WSL2

Open PowerShell as Administrator:

```powershell
wsl --install
```

Restart your computer when prompted. On first boot, create your Linux username and password.

### Step 2: Install Prerequisites in WSL

Open your WSL terminal (search "Ubuntu" in Start menu):

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Git
sudo apt install git -y

# Install Bun (1.3.9+ required)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verify Bun version
bun --version  # Should show 1.3.9 or higher
```

### Step 3: Clone and Install PAI-OpenCode

**Important:** Clone inside the WSL filesystem, NOT in `/mnt/c/`

```bash
# Navigate to your WSL home directory
cd ~

# Clone the repository
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# Run the installer
bash PAI-Install/install.sh

# Start OpenCode
opencode
```

### Accessing Files

Your WSL files are accessible from Windows Explorer at:
```
\\wsl$\Ubuntu\home\<your-username>\pai-opencode
```

Or open Explorer from WSL:
```bash
explorer.exe .
```

### Tips for WSL Users

- **VS Code:** Install the "WSL" extension to edit files directly in WSL
- **Terminal:** Windows Terminal provides a better WSL experience than the default
- **Performance:** Files in WSL filesystem (`~/`) are faster than `/mnt/c/`

---

## Post-Installation

After installation, see [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md) for:
- Custom provider configuration (beyond the 4 presets)
- Multi-provider research setup
- Voice server configuration
- Observability dashboard
- Custom agent creation

---

## Manual Installation

If you prefer to run the headless installer directly:

**Step 1:** Install vanilla OpenCode from opencode.ai
```bash
curl -fsSL https://opencode.ai/install | bash
```

> [!NOTE]
> Bun 1.3.9+ is required only for PAI-OpenCode's tooling (installer, plugins, skills, MCP servers) — **not** to compile OpenCode itself. PAI-OpenCode v3.0+ ships against the vanilla `opencode.ai` binary. Verify with `bun --version` and update with `bun upgrade` if needed.

**Step 2:** Clone the PAI-OpenCode repository
```bash
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode
```

**Step 3:** Install dependencies
```bash
bun install
```

**Step 4:** Create symlink to connect OpenCode with PAI
```bash
# Remove the empty .opencode folder that OpenCode created (if any)
rm -rf ~/.opencode

# Create symlink from your home directory to your PAI-OpenCode installation
ln -s $(pwd)/.opencode ~/.opencode
```

**Step 5:** Launch OpenCode
```bash
opencode
```


---

## Migrating from Claude Code PAI?

If you already have a PAI installation on Claude Code, see our [Migration Guide](docs/MIGRATION.md) for step-by-step instructions on transferring your skills, agents, and memory.

---

## First Run Verification

After installation, verify everything works:

1. **Check Skills Loading**
   - On first message, PAI skill auto-loads (tier: always)
   - Ask: "What skills do I have?"

2. **Test an Agent**
   ```
   @Intern hello
   ```

3. **Verify Plugins**
   - Check: `tail -f /tmp/pai-opencode-debug.log`
   - Should show: "PAI-OpenCode Plugin Loaded"

---

## Troubleshooting

### "Command not found: opencode"

The installer builds/installs OpenCode depending on your selected preset and platform.

**Check where it was installed:**
```bash
which opencode
ls -la ~/.local/bin/opencode
ls -la /usr/local/bin/opencode
```

**If `~/.local/bin` is not in your PATH, add it:**
```bash
export PATH="$HOME/.local/bin:$PATH"
```

**Make it permanent** (add to your shell config):
```bash
# For bash users:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# For zsh users:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Alternatively, use the full path:**
```bash
~/.local/bin/opencode
```

### "Bun command not found"

Restart your terminal after installing Bun, or manually source:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Skills Not Loading

Check `.opencode/skills/` directory exists and contains `SKILL.md` files:
```bash
ls -la .opencode/skills/*/SKILL.md
```

### Plugin Errors

Check debug log for errors:
```bash
cat /tmp/pai-opencode-debug.log
```

---

## Configuration

### Environment Variables

Edit `.opencode/settings.json`:
```json
{
  "env": {
    "ENGINEER_NAME": "YourName",
    "TIME_ZONE": "Europe/Berlin",
    "DA": "YourAssistantName"
  }
}
```

---

## Provider Configuration

### Default: Zen Free (No Setup Required)

PAI-OpenCode ships with **OpenCode Zen free** as the default provider. Big Pickle — Zen's free flagship model — works out of the box with no API key or account required. Just install and start.

### Connecting Premium Providers

Provider setup is a **post-install step** — PAI-OpenCode ships with Zen free so you can start immediately, then connect additional providers whenever you're ready.

Connecting a provider is a two-step process:

#### Step 1 — Establish credentials via `/connect`

Run `/connect` inside a running OpenCode session and follow the prompts:

```text
/connect
```

OpenCode stores credentials securely in `~/.opencode/`. Supported providers:

| Provider | Best For | Cost |
|----------|----------|------|
| **Zen paid** | Budget-friendly paid models (GLM 4.7, Kimi K2.5, Gemini Flash) | ~$1-15/1M tokens |
| **Anthropic (API key)** | Best quality, Claude Opus 4.6 / Sonnet 4.5 | Pay-per-token |
| **OpenRouter** | Provider diversity, 100+ models | Varies by model |
| **OpenAI** | GPT-4o, GPT-4.1 | ~$10-30/1M tokens |
| **Ollama** | Local, private, offline | Free (your hardware) |

#### Step 2 — Update agent model assignments in `opencode.json`

`/connect` stores your credentials, but the agent model strings in `opencode.json` still point to the Zen free defaults. Switch them to your newly connected provider:

```bash
# Switch all agents to Anthropic models
bun run .opencode/tools/switch-provider.ts anthropic

# Switch to paid Zen models
bun run .opencode/tools/switch-provider.ts zen-paid

# Switch to OpenAI models
bun run .opencode/tools/switch-provider.ts openai

# List all available profiles
bun run .opencode/tools/switch-provider.ts --list
```

See [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md) for manual `opencode.json` editing and custom profiles.

---

### ⚠️ Anthropic Claude Max — Important Note

Anthropic's Claude Max subscription (the one used at claude.ai) is designed for direct human use. Routing it through a third-party tool like OpenCode via OAuth is a **grey area in Anthropic's Terms of Service** and carries a risk of account suspension.

**How the connection works technically:**
OpenCode connects to Claude Max via a community plugin — [`cemalturkcan/opencode-anthropic-login-via-cli`](https://github.com/cemalturkcan/opencode-anthropic-login-via-cli) — that authenticates your Claude Max account and proxies requests through it.

**Why PAI-OpenCode does not ship this plugin:**
We intentionally exclude it from the distribution. Installing and using it is your own decision and responsibility — we do not want to expose users to ToS risk without their explicit informed consent.

**Alternatives that are clearly within Anthropic's ToS:**
- **Anthropic API key** — Pay-per-token access via [console.anthropic.com](https://console.anthropic.com/). Add `ANTHROPIC_API_KEY=sk-ant-...` to `~/.opencode/.env` and run `/connect` → Anthropic.
- **OpenCode Zen paid** — High-quality models at competitive rates, no ToS concerns. Includes access to models equivalent in capability to Sonnet/Opus tiers.

### Changing Providers After Install

```bash
# Re-run the installer in headless mode to reconfigure a specific preset
bash PAI-Install/install.sh --headless --preset openai --name "Your Name" --ai-name "Jeremy"
```

### Advanced Provider Setup

For custom provider configuration, see [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md).

### Multi-Provider Research (Optional)

For richer research results from diverse AI perspectives:

```bash
bun run .opencode/tools/switch-provider.ts --add-researchers
```

This adds research agents to your configuration. Requires additional API keys in `~/.opencode/.env`:
```bash
GOOGLE_API_KEY=your_key        # GeminiResearcher
XAI_API_KEY=your_key           # GrokResearcher
PERPLEXITY_API_KEY=your_key    # PerplexityResearcher
OPENROUTER_API_KEY=your_key    # CodexResearcher
```

Check which keys you have:
```bash
bun run .opencode/tools/switch-provider.ts --researchers
```

### API Keys for Multi-Provider Research (Optional)

| Provider | Where to Get Key | For |
|----------|-----------------|-----|
| Anthropic | https://console.anthropic.com/ | Claude models |
| Google | https://aistudio.google.com/apikey | GeminiResearcher |
| xAI | https://console.x.ai/ | GrokResearcher |
| Perplexity | https://perplexity.ai/settings/api | PerplexityResearcher |
| OpenRouter | https://openrouter.ai/keys | CodexResearcher |

---

## Optional Services

### Voice Server (TTS Notifications)

Enable spoken notifications for task completions and agent results:

```bash
# Start the voice server
cd .opencode/voice-server
bun run server.ts
```

**Supported TTS Providers:**
1. **ElevenLabs** (default) - High-quality voices, requires API key
2. **Google Cloud TTS** - Alternative, requires API key
3. **macOS `say`** - Free fallback, built-in

Configure in `.opencode/.env`:
```bash
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_key_here
```

See [.opencode/voice-server/README.md](.opencode/voice-server/README.md) for details.

### Observability Dashboard

Monitor sessions, tools, and agents in real-time:

```bash
# Start the observability server
cd .opencode/observability-server
bun run server.ts
```

Dashboard available at `http://localhost:8889`

**Features:**
- Real-time event streaming via SSE
- Session lifecycle tracking
- Tool usage analytics
- Agent spawn monitoring
- Vue 3 dashboard with GitHub Dark theme

See [.opencode/observability-server/README.md](.opencode/observability-server/README.md) for details.

---

## Next Steps

- Read [docs/WHAT-IS-PAI.md](docs/WHAT-IS-PAI.md) for PAI fundamentals
- Explore [docs/OPENCODE-FEATURES.md](docs/OPENCODE-FEATURES.md) for OpenCode features
- See [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md) for custom configuration

---

## Getting Help

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/Steffen025/pai-opencode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Steffen025/pai-opencode/discussions)

---

**Installed successfully?** Give us a star on GitHub!
