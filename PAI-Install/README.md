# PAI-OpenCode Installer

> GUI and CLI installer for PAI-OpenCode v3.0

## Quick Start

```bash
# Run the installer
bash PAI-Install/install.sh
```

## What This Installer Does

1. **Detects** your environment (macOS/Linux)
2. **Installs** Bun runtime if not present
3. **Creates** `~/.opencode/` directory structure
4. **Copies** PAI core files (skills, plugins, handlers)
5. **Configures** `opencode.json` with Model Tiers
6. **Sets up** the Electron GUI (optional)

## Directory Structure

```
PAI-Install/
├── install.sh           # Main bootstrap script
├── main.ts              # TypeScript entry point
├── generate-welcome.ts  # Welcome screen generator
├── cli/                 # CLI installer module
│   ├── index.ts
│   ├── display.ts
│   └── prompts.ts
├── engine/              # Install engine
│   ├── index.ts
│   ├── actions.ts
│   ├── config-gen.ts
│   ├── detect.ts
│   ├── state.ts
│   ├── steps.ts
│   ├── types.ts
│   └── validate.ts
├── electron/            # Electron GUI app
│   ├── main.js
│   ├── package.json
│   └── package-lock.json
├── web/                   # Web UI for Electron
│   ├── server.ts
│   └── routes.ts
└── public/                # Static assets
    ├── index.html
    ├── styles.css
    ├── app.js
    └── assets/
        ├── pai-logo.png
        ├── banner.png
        ├── fonts/
        └── audio/
```

## Installation Modes

### CLI Mode (Default)
Terminal-based interactive installation.

### GUI Mode
```bash
bash PAI-Install/install.sh --gui
```
Launches Electron installer with visual step-by-step setup.

## Post-Installation

After installation, you'll have:

- `~/.opencode/skills/` — PAI skills and tools
- `~/.opencode/plugins/` — Event handlers
- `~/.opencode/commands/` — Custom OpenCode commands
- `~/.opencode/MEMORY/` — Working memory and state
- `~opencode.json` — Configuration with Model Tiers

## Upgrade from v2.x

See [UPGRADE.md](/UPGRADE.md) for migration instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bun not found | Installer will auto-install Bun |
| Permission denied | Run with `bash` not `sh` |
| Electron fails | Use CLI mode: `install.sh --cli` |

## Requirements

- macOS 10.15+ or Linux
- bash 4.0+
- curl
- 500MB free disk space

---

*Part of PAI-OpenCode v3.0 — Personal AI Infrastructure*
