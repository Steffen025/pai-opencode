# AGENTS.md — PAI-OpenCode Repository

| Runtime | Linter | Lang |
|---------|--------|------|
| Bun (never npm/yarn/pnpm) | Biome (never ESLint/Prettier) | TypeScript ESM |

```bash
bun install                  # Install dependencies
bun test                     # Run tests
biome check .                # Lint + format check
biome check --write .        # Auto-fix
```

**Commits:** `feat(scope):`, `fix(scope):`, `docs:`, `chore:` — branch from `dev`, PR to `dev`, never commit to `main`.

**PAI System:** Loaded via skill system (`PAI/SKILL.md`, tier: always). Not in this file.
