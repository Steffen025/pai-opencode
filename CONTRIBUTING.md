# Contributing to PAI-OpenCode

Thank you for your interest in contributing! This document provides guidelines for contributing to PAI-OpenCode.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## How to Contribute

### Reporting Issues

Before creating an issue:
1. Search existing issues to avoid duplicates
2. Verify the issue exists on the latest version
3. Gather relevant information (OS, OpenCode version, error logs)

**Good Issue Template:**
```markdown
**Description:** Brief summary of the issue

**Steps to Reproduce:**
1. Step one
2. Step two
3. What happened

**Expected Behavior:** What should happen

**Environment:**
- OS: macOS 14.5
- OpenCode version: v0.9.3
- Bun version: 1.0.22

**Logs/Screenshots:** Attach relevant output
```

### Suggesting Features

Feature requests are welcome! Include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed implementation
- **Alternatives**: Other approaches considered
- **Impact**: Who benefits from this feature?

### Pull Requests

#### Before You Start

1. **Check existing work**: Search issues and PRs to avoid duplication
2. **Discuss major changes**: Open an issue first for significant features
3. **Fork the repository**: Work on your own fork

#### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/pai-opencode.git
cd pai-opencode

# Install dependencies
bun install

# Create feature branch
git checkout -b feature/your-feature-name
```

#### Code Style

**TypeScript Conventions:**
- Use TypeScript for all plugins and tools
- Follow existing patterns in `.opencode/plugins/` and `.opencode/tools/`
- Add JSDoc comments for public functions
- Use type annotations (avoid `any`)

**Markdown Style:**
- Use ATX-style headers (`#` not `===`)
- Code blocks with language specifiers
- Add blank line before/after code blocks

**YAML Frontmatter (Skills):**
```yaml
---
name: SkillName
description: USE WHEN trigger keywords...
---
```

#### Commit Messages

Follow conventional commits:
```
type(scope): subject

- feat(skills): Add new Research skill
- fix(plugins): Resolve security validator false positive
- docs(readme): Update installation instructions
- chore(deps): Update Bun to v1.0.23
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance (deps, config)
- `refactor`: Code restructuring

#### Pull Request Process

1. **Update documentation**: Add/update relevant docs
2. **Test thoroughly**: Verify your changes work
3. **Create PR**:
   - Clear title following commit convention
   - Description linking to issue (`Closes #123`)
   - Screenshots/logs if applicable

## Project Structure

```
.opencode/
├── skills/           # Skill definitions (SKILL.md files)
├── agents/           # Agent configurations (PascalCase)
├── plugins/          # Lifecycle plugins (TypeScript)
├── MEMORY/           # Execution history (not in git)
├── PAISECURITYSYSTEM/ # Security patterns
├── PAISYSTEM/        # System documentation
└── settings.json     # Configuration
```

## Importing PAI Versions

When upgrading PAI-OpenCode to a new PAI version (e.g., 2.4 → 2.5), follow the mapping guide:

📖 **[PAI-to-OpenCode Mapping Guide](.opencode/PAISYSTEM/PAI-TO-OPENCODE-MAPPING.md)**

This document covers:
- **Architecture differences** (`.claude/` → `.opencode/`, hooks → plugins)
- **Component mapping rules** (Skills, Agents, CORE, MEMORY)
- **What NOT to import** (Observability, VoiceServer, lib/)
- **Common import errors** (nested SKILL.md, long descriptions, color format)
- **Pre/During/Post import checklists**

**Critical rules:**
- Skills are **FLAT**: `skills/SkillName/SKILL.md` (NOT `SkillName/SkillName/`)
- Agent colors must be **hex format**: `#00FFFF` (NOT `cyan`)
- YAML descriptions must be **<220 characters**
- Fabric patterns go **only** in `skills/Fabric/Patterns/`

### Adding a New Skill

1. Create directory: `.opencode/skills/YourSkill/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: YourSkill
   description: USE WHEN user says "trigger keywords"...
   ---
   ```
3. Add skill content (instructions, examples)
4. Test: Search for your skill and verify it loads

### Adding a Plugin Handler

1. Create handler in `.opencode/plugins/handlers/your-handler.ts`
2. Export handler function
3. Add event subscription to `plugins/pai-unified.ts`
4. Use `fileLog()` instead of `console.log()`

## Stack Conventions

- **Runtime**: Always use Bun (never npm/yarn/pnpm)
- **Language**: TypeScript preferred
- **Package Manager**: `bun install`, `bun add`, `bun run`
- **Formatting**: Follow existing patterns

## Questions?

- Open a [Discussion](https://github.com/Steffen025/pai-opencode/discussions)
- Check [docs/](docs/) for architecture details
- Review existing code for patterns

---

**Thank you for contributing to PAI-OpenCode!**
