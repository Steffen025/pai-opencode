# ADR-005: Configuration - Dual File Approach

> [!warning] PARTIAL SUPERSESSION — Vanilla Migration (April 2026)
> The `model_tiers` aspects of this ADR are **superseded by ADR-019 (Vanilla OpenCode Migration)**.
> PAI-OpenCode no longer supports runtime `model_tier` selection. Each agent now has exactly one
> configured model in `opencode.json`. The sections below that describe `model_tiers` are preserved
> as historical record. See ADR-019 for the current configuration approach.

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** configuration, platform-convention, compatibility

---

## Context

**PAI v2.4 (Claude Code):**
- Uses `settings.json` for all configuration
- Contains: identity, environment variables, hooks config, permissions

**OpenCode Platform:**
- Uses `opencode.json` for platform configuration
- Contains: plugins, providers, model selection

**The Problem:**
- Can't merge into one file without losing structure
- Both files have different purposes
- Users familiar with either platform have expectations

---

## Decision

**Maintain BOTH configuration files with clear separation of concerns.**

### `.opencode/settings.json` (PAI Configuration)

**Purpose:** PAI-specific settings that PAI components read

**Contains:**
```json
{
  "paiVersion": "2.4-opencode",
  "env": {
    "PAI_DIR": "/path/to/.opencode",
    "BASH_DEFAULT_TIMEOUT_MS": "600000"
  },
  "contextFiles": [
    "skills/CORE/SKILL.md",
    "skills/CORE/SYSTEM/AISTEERINGRULES.md"
  ],
  "daidentity": {
    "name": "Jeremy",
    "voiceId": "..."
  },
  "principal": {
    "name": "Steffen",
    "timezone": "Europe/Berlin"
  }
}
```

### `opencode.json` (OpenCode Configuration)

**Purpose:** OpenCode platform settings

**Contains:**
```json
{
  "plugin": [
    "file://{PAI_DIR}/plugins/pai-unified.ts"
  ],
  "provider": {
    "id": "anthropic",
    "model": "anthropic/claude-sonnet-4-5"
  }
}
```

### v1.3.0: Agent-Specific Model Routing

**New in v1.3.0:** Agent-specific model configuration with tier support:

```json
{
  "provider": {
    "id": "anthropic",
    "model": "anthropic/claude-opus-4-6"
  },
  "agent": {
    "Engineer": {
      "model": "opencode/glm-4.7",
      "model_tiers": {
        "quick": { "model": "opencode/glm-4.7" },
        "standard": { "model": "opencode/glm-4.7" },
        "advanced": { "model": "opencode/kimi-k2.5" }
      }
    },
    "DeepResearcher": {
      "model": "opencode/glm-4.7",
      "model_tiers": {
        "quick": { "model": "opencode/minimax-m2.1" },
        "standard": { "model": "opencode/glm-4.7" },
        "advanced": { "model": "opencode/kimi-k2.5" }
      }
    }
  }
}
```

**Key Changes:**
- `default_model` → `model` at provider level
- New `agent` section with per-agent model routing
- `model_tiers`: quick/standard/advanced for cost/quality optimization
- 16 agents with individual routing configuration

*(Note: model_tiers removed in the April 2026 vanilla migration — see ADR-019.)*

---

## Rationale

### 1. Separation of Concerns

| Config File | Owns | Read By |
|-------------|------|---------|
| `settings.json` | PAI identity, context, env vars | PAI plugins, skills, tools |
| `opencode.json` | Platform plugins, providers | OpenCode platform |

Clear ownership = less confusion.

### 2. PAI Configuration Portability

`settings.json` structure is:
- Platform-agnostic (works on Claude Code and OpenCode)
- Familiar to PAI users migrating from Claude Code
- Easy to share/template (no platform-specific settings mixed in)

### 3. OpenCode Platform Evolution

OpenCode can add new platform features without affecting PAI config:
- New plugin capabilities → `opencode.json`
- New provider options → `opencode.json`
- PAI features unchanged → `settings.json`

### 4. Upgrade Path Clarity

When upgrading:
- **PAI updates (v2.4 → v2.5):** Only `settings.json` changes
- **OpenCode updates:** Only `opencode.json` changes
- Clear separation reduces merge conflicts

---

## Alternatives Considered

### 1. Merge everything into `opencode.json`
**Rejected** because:
- Loses PAI configuration portability
- Mixes platform and application concerns
- Harder to sync updates from upstream PAI
- Unfamiliar structure for PAI users

### 2. Use only `settings.json` (ignore opencode.json)
**Rejected** because:
- OpenCode platform expects `opencode.json`
- Some settings (plugins) MUST be in platform file
- Fights platform conventions

### 3. Three files (settings.json, opencode.json, pai-opencode.json)
**Rejected** because:
- Overkill - two files sufficient
- Confusing which file owns what
- Maintenance burden

---

## Consequences

### ✅ **Positive**

- **Clear Ownership:** No confusion about which file to edit
  - Identity/environment → `settings.json`
  - Plugins/providers → `opencode.json`

- **PAI Config Portable:** `settings.json` works on both platforms
  - Can share configs between Claude Code PAI and pai-opencode
  - Easier for users switching platforms

- **Platform Evolution:** OpenCode changes don't affect PAI config
  - Clean upgrade path for both systems
  - Independent versioning

### ❌ **Negative**

- **Two Files to Maintain:** Must document both
  - *Mitigation:* Clear README section explaining purpose of each
  - *Mitigation:* Installer sets up both files

- **Potential Confusion:** Users might edit wrong file
  - *Mitigation:* Comments in each file explaining purpose
  - *Example:*
    ```json
    // settings.json
    {
      "// NOTE": "PAI configuration (identity, env). OpenCode platform config in opencode.json"
    }
    ```

- **Initial Learning Curve:** New users must understand two-file model
  - *Mitigation:* Installer explains during setup
  - *Mitigation:* FAQ in documentation

---

## Configuration Examples

### Example: Changing AI Assistant Name

**File:** `settings.json`
```json
{
  "daidentity": {
    "name": "TARS"  // ← Edit here
  }
}
```

### Example: Switching AI Provider

**File:** `opencode.json`
```json
{
  "provider": {
    "id": "openai",  // ← Edit here
    "model": "openai/gpt-4"
  }
}
```

**v1.3.0 Note:** Provider switching uses a small set of installer presets. Use the installer or `switch-provider.ts` to change profiles.

### Example: Adding Plugin

**File:** `opencode.json`
```json
{
  "plugin": [
    "file://{PAI_DIR}/plugins/pai-unified.ts",
    "file://{PAI_DIR}/plugins/custom-plugin.ts"  // ← Add here
  ]
}
```

---

## Documentation Strategy

### In README.md

```markdown
## Configuration Files

pai-opencode uses two configuration files:

| File | Purpose | Edit For |
|------|---------|----------|
| `.opencode/settings.json` | PAI configuration | Your name, AI name, environment variables |
| `opencode.json` | OpenCode platform | AI provider, plugins, platform settings |

**Quick Reference:**
- "I want to change my AI's name" → `settings.json`
- "I want to switch from Anthropic to OpenAI" → `opencode.json`
```

### In INSTALL.md

```markdown
## Configuration

The installer creates two files:

1. **settings.json** - Your PAI configuration (identity, preferences)
2. **opencode.json** - OpenCode platform settings (provider, plugins)

Both files must be present for pai-opencode to work.
```

---

## Verification

Ensure both files present and valid:
```bash
# Check both exist
ls -la .opencode/settings.json opencode.json

# Validate JSON syntax
jq empty .opencode/settings.json
jq empty opencode.json

# Check required PAI fields
jq '.daidentity.name' .opencode/settings.json  # Should output name

# Check required OpenCode fields
jq '.provider.id' opencode.json  # Should output provider
```

---

## References

- **PAI Config:** `.opencode/settings.json`
- **Platform Config:** `opencode.json`
- **Installer:** `PAI-Install/install.sh` (sets up both)
- **Examples:** Documented in README.md

---

## Related ADRs

- ADR-002: Directory Structure (defines where files live)

---

*This ADR establishes the two-file configuration model for pai-opencode.*
