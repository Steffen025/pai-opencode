# PAI OpenCode Installer

CLI-only installer for PAI OpenCode.

## Quick Start

```bash
bash PAI-Install/install.sh --help

# Example: fresh install (Zen)
bash PAI-Install/install.sh --preset zen --name "Your Name" --ai-name "Jeremy"
```

> **Note:** The `--cli` flag is accepted for backward compatibility but is no longer required.

## What This Installer Does

1. Checks prerequisites (git, bun)
2. Optionally builds a custom OpenCode binary (model tiers)
3. Generates/updates `opencode.json` and `~/.opencode/*`
4. Installs PAI files into `~/.opencode/`

## Directory Structure

```text
PAI-Install/
├── install.sh              # Bootstrap (Bun + CLI entrypoint)
├── cli/
│   └── quick-install.ts    # Headless/CLI installer
├── engine/                 # Install engine (fresh/migrate/update)
│   ├── actions.ts
│   ├── build-opencode.ts
│   ├── config-gen.ts
│   ├── detect.ts
│   ├── index.ts
│   ├── migrate.ts
│   ├── provider-models.ts
│   ├── state.ts
│   ├── steps-fresh.ts
│   ├── steps-migrate.ts
│   ├── steps-update.ts
│   ├── types.ts
│   ├── update.ts
│   └── validate.ts
└── wrapper-template.sh      # Optional OpenCode wrapper script template
```

## Notes

- GUI installer was removed. `install.sh` always runs the CLI installer.
- The `--cli` flag is accepted for backward compatibility but is optional (the default behavior is CLI mode).

## Post-Installation

After installation, you'll have:

- `~/.opencode/skills/` — PAI skills and tools
- `~/.opencode/plugins/` — Event handlers
- `~/.opencode/commands/` — Custom OpenCode commands
- `~/.opencode/MEMORY/` — Working memory and state
- `~/.opencode/opencode.json` — OpenCode config with model tiers

## Upgrade from v2.x

See [UPGRADE.md](/UPGRADE.md) for migration instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bun not found | Installer will auto-install Bun |
| Permission denied | Run with `bash` not `sh` |

## Requirements

- macOS 10.15+ or Linux
- bash 4.0+
- curl
- 500MB free disk space

---

*Part of PAI-OpenCode v3.0 — Personal AI Infrastructure*