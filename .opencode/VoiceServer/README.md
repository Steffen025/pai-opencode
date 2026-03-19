# PAI Voice Server

Voice notification system for Jeremy - announces task completions and agent results via Text-to-Speech.

## Quick Reference

### Volume Control

```bash
# Show current volume
bun run $PAI_DIR/tools/voice-volume.ts

# Set specific volume (0.0-1.0)
bun run $PAI_DIR/tools/voice-volume.ts 0.3    # 30%
bun run $PAI_DIR/tools/voice-volume.ts 0.2    # 20%

# Quick adjustments
bun run $PAI_DIR/tools/voice-volume.ts up     # +10%
bun run $PAI_DIR/tools/voice-volume.ts down   # -10%
bun run $PAI_DIR/tools/voice-volume.ts mute   # Stumm (0%)
bun run $PAI_DIR/tools/voice-volume.ts reset  # Default (40%)
```

**Default volume:** 40% (configurable in `config/voice-personalities.json`)

### Server Management

```bash
# Start voice server (foreground)
bun run $PAI_DIR/voice-server/server.ts

# Start in background
nohup bun run $PAI_DIR/voice-server/server.ts > /dev/null 2>&1 &

# Check if running
lsof -i :8888

# Stop
pkill -f "voice-server/server.ts"
```

**Default port:** 8888 (configurable via `PAI_VOICE_PORT` env var)

## Architecture

```
┌─────────────────┐     HTTP POST      ┌──────────────────┐
│  Claude Hooks   │ ─────────────────► │   Voice Server   │
│  (stop-hook)    │    /notify         │   (port 8888)    │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                            ┌─────────────┐         ┌─────────────┐
                            │ Google TTS  │         │ ElevenLabs  │
                            │ (Chirp 3)   │         │   (Legacy)  │
                            └──────┬──────┘         └──────┬──────┘
                                   │                       │
                                   └───────────┬───────────┘
                                               ▼
                                    ┌─────────────────┐
                                    │  Audio Player   │
                                    │  (afplay/mpv)   │
                                    └─────────────────┘
```

## Configuration

### Volume (voice-personalities.json)

```json
{
  "default_volume": 0.4,  // 0.0 (mute) to 1.0 (max)
  ...
}
```

The volume tool modifies this value. Changes take effect on next voice notification.

### TTS Provider

Set via environment variables:

| Variable | Values | Default |
|----------|--------|---------|
| `TTS_PROVIDER` | `google`, `elevenlabs` | `elevenlabs` |
| `GOOGLE_TTS_TIER` | `premium`, `standard` | `standard` |
| `GOOGLE_API_KEY` | API key | - |
| `ELEVENLABS_API_KEY` | API key | - |

### Voice Personalities

Four named agents have distinct voices:

| Agent | Voice | Accent | Speaking Rate |
|-------|-------|--------|---------------|
| **PAI** (Jeremy) | Algenib / Neural2-B | British | 1.0x |
| **Intern** | Puck / Neural2-D | American | 1.15x (fast) |
| **Engineer** | Charon / Neural2-B | Australian | 0.95x |
| **Architect** | Vindemiatrix / Neural2-A | Indian | 0.90x (deliberate) |

## Hooks Integration

### Main Agent (stop-hook-voice.ts)

Triggers on session completion:
- Extracts COMPLETED message from transcript
- Sends to voice server with agent type "pai"

### Subagents (subagent-stop-hook-voice.ts)

Triggers on subagent completion:
- Routes based on agent type (intern, engineer, architect, etc.)
- Silent tier blocks: explore, plan (no voice spam)

## Troubleshooting

### No sound

1. Check server is running: `lsof -i :8888`
2. Check logs: `tail -f $PAI_DIR/voice-server/logs/voice-server.log`
3. Verify volume not muted: `bun run $PAI_DIR/tools/voice-volume.ts`

### Too loud/quiet

```bash
bun run $PAI_DIR/tools/voice-volume.ts 0.3  # Adjust as needed
```

### API errors

Check environment variables are set:
```bash
echo $GOOGLE_API_KEY
echo $ELEVENLABS_API_KEY
```

## Files

| File | Purpose |
|------|---------|
| `voice-server/server.ts` | Main server implementation |
| `tools/voice-volume.ts` | Volume control CLI |
| `config/voice-personalities.json` | Voice config + volume setting |
| `hooks/stop-hook-voice.ts` | Main agent hook |
| `hooks/subagent-stop-hook-voice.ts` | Subagent hook |
