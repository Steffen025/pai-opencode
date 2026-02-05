# PAI-OpenCode Installation Guide

Welcome to PAI (Personal AI Infrastructure) on OpenCode.

## Prerequisites

1. **Bun** - JavaScript/TypeScript runtime
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **OpenCode** - AI coding assistant
   ```bash
   # Option A: Via Go (recommended)
   go install github.com/anomalyco/opencode@latest

   # Option B: Build from source
   git clone https://github.com/anomalyco/opencode.git
   cd opencode && go build -o opencode . && sudo mv opencode /usr/local/bin/
   ```

## Installation

### Method 1: Fresh Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# Install dependencies
bun install

# Start OpenCode
opencode
```

That's it! PAI 2.5 is now running on OpenCode.

### Method 2: Migration from Claude Code PAI

If you have an existing PAI installation on Claude Code:

```bash
# Preview changes (dry run)
bun Tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --dry-run

# Review the output, then run for real
bun Tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode
```

See `docs/CONVERTER.md` for detailed migration guide.

## Verification

Start OpenCode and verify:
- **Skills load**: Ask "What skills do I have?"
- **Agents work**: Try `@intern hello`
- **Security active**: Check `/tmp/pai-opencode-debug.log`

## Configuration

Edit `.opencode/settings.json` to customize:
- Your name
- AI preferences
- Permissions

## Voice Server Setup (Optional)

PAI-OpenCode includes a voice notification server for TTS (Text-to-Speech) output.

### Quick Start

```bash
# Start the voice server
cd .opencode/voice-server
bun run server.ts
```

The server runs on `localhost:8888` by default.

### TTS Provider Configuration

Add to your `.opencode/.env`:

**Option A: ElevenLabs (Recommended)**
```bash
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh  # Optional, this is the default
```

**Option B: Google Cloud TTS**
```bash
TTS_PROVIDER=google
GOOGLE_API_KEY=your_key_here
GOOGLE_TTS_TIER=premium  # or 'standard'
```

### Run as Background Service

```bash
# Start in background
nohup bun run .opencode/voice-server/server.ts > /dev/null 2>&1 &

# Or use PM2
pm2 start .opencode/voice-server/server.ts --name pai-voice --interpreter bun
```

### Fallback Behavior

If the voice server is unavailable, PAI-OpenCode automatically falls back to:
1. Google Cloud TTS (if `GOOGLE_TTS_API_KEY` configured)
2. macOS `say` command (on macOS only)

See `.opencode/voice-server/README.md` for detailed documentation.

## Observability Dashboard Setup (Optional)

PAI-OpenCode includes a real-time observability dashboard for monitoring sessions, tools, and agents.

### Quick Start

```bash
# Start the observability server
cd .opencode/observability-server
bun run server.ts
```

The dashboard will be available at `http://localhost:8889` by default.

### What You Get

- **Real-time event streaming** via Server-Sent Events (SSE)
- **Session tracking** with lifecycle management
- **Tool usage analytics** across all sessions
- **Agent spawn monitoring** for parallel work visibility
- **Vue 3 Dashboard** with GitHub Dark theme

### Run as Background Service

```bash
# Start in background
nohup bun run .opencode/observability-server/server.ts > /dev/null 2>&1 &

# Or use PM2
pm2 start .opencode/observability-server/server.ts --name pai-observability --interpreter bun
```

### Configuration

Environment variables (optional):
```bash
PORT=8889                    # Server port
DATA_DIR=./data             # SQLite database directory
RETENTION_HOURS=168         # Session retention (7 days)
```

See `.opencode/observability-server/README.md` for detailed documentation.

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| Skills | 29 | PAI 2.5 skills adapted for OpenCode |
| Agents | 16 | Named AI personalities |
| Plugin | 1 | Unified (14 handlers: security, context, voice, sentiment, observability) |
| Voice Server | 1 | TTS notifications (ElevenLabs/Google) |
| Converter | 1 | For migrating PAI updates |

> **Note:** For detailed installation instructions including the Installation Wizard, see [INSTALL.md](../INSTALL.md) in the repository root.

## What's Different from Claude Code PAI

| PAI 2.5 (Claude Code) | PAI-OpenCode |
|-----------------------|--------------|
| `hooks/` | `plugins/` |
| `.claude/` | `.opencode/` |
| Claude Code CLI | OpenCode CLI |
| Exit code blocking | Throw Error blocking |

See `docs/HOOK-TO-PLUGIN-TRANSLATION.md` for technical details.

## Troubleshooting

### "opencode: command not found"
```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

### Plugin doesn't load
```bash
cat /tmp/pai-opencode-debug.log
# Should show: "PAI-OpenCode Plugin Loaded"
```

### TUI corruption
```bash
reset && opencode
```

## Getting Help

- **Documentation**: `skills/PAI/SKILL.md`
- **GitHub**: [github.com/Steffen025/pai-opencode](https://github.com/Steffen025/pai-opencode)

---

Welcome to PAI-OpenCode!
