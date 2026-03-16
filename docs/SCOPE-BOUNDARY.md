# Scope Boundary: PAI-OpenCode vs. Open Arc

**Document Purpose:** Explicitly defines what belongs in PAI-OpenCode and what belongs in Open Arc (jeremaiah.ai). Prevents scope creep and maintains clear project boundaries.

---

## PAI-OpenCode: Community Contribution

**Mission:** Port Daniel Miessler's PAI system to OpenCode platform, leveraging OpenCode-native features. Minimal, focused, maintainable.

**Tagline:** "PAI on OpenCode — native, lean, community-driven."

### What PAI-OpenCode IS

| Category | Included | Rationale |
|----------|----------|-----------|
| **Core** | PAI Algorithm v3.7.0 | The foundational hill-climbing system |
| **Skills** | Hierarchical skill structure (11 categories) | PAI v4.0.3 organization, ported to `.opencode/` |
| **Native Integration** | Lazy Loading, Model Tiers, Events, MCP | OpenCode-native features, not abstractions |
| **Documentation** | Setup guides, porting docs, API reference | Enable community adoption |
| **CI/CD** | GitHub Actions, Biome, testing | Professional open-source standards |
| **Security** | Prompt injection protection | Defense in depth for LLM interactions |

### What PAI-OpenCode is NOT (Explicit Exclusions)

| Excluded Feature | Belongs To | Why Excluded |
|------------------|------------|--------------|
| **Voice-to-Voice** | Open Arc | Custom orchestration layer, not PAI core |
| **Ambient AI / OMI** | Open Arc | Hardware integration, custom protocols |
| **Custom UX/UI** | Open Arc | Branded product experience |
| **User Management** | Open Arc | SaaS infrastructure |
| **Proprietary Protocols** | Open Arc | jeremaiah.ai IP |
| **Advanced Personalization** | Open Arc | Beyond standard PAI TELOS |

---

## Open Arc: The Future Vision

**Mission:** The next generation of personal AI — voice-first, ambient, deeply integrated.

**Tagline:** "Your AI companion, everywhere."

### Open Arc Features (Future, Not in PAI-OpenCode)

- **Voice Architecture:** Real-time voice-to-voice, prosody, emotion detection
- **Ambient Integration:** OMI hardware, always-on, context-aware
- **Brand Experience:** jeremaiah.ai identity, personality, voice
- **Product Layer:** End-user application, not developer toolkit
- **SaaS Infrastructure:** Multi-tenant, user management, billing

---

## The Boundary Line

**Simple Rule:**
- If it's an **OpenCode-native feature** that makes PAI run better on OpenCode → **PAI-OpenCode**
- If it's a **new abstraction or product feature** beyond OpenCode's built-in capabilities → **Open Arc**

**Examples:**

| Feature | Decision | Reasoning |
|---------|----------|-----------|
| Model Tiers using `opencode.json` agent config | ✅ PAI-OpenCode | Native OpenCode feature |
| Custom voice orchestration server | ❌ Open Arc | New abstraction beyond PAI core |
| Lazy Loading via `skill` tool | ✅ PAI-OpenCode | Native OpenCode feature |
| OMI ambient AI integration | ❌ Open Arc | Hardware/product feature |
| Event-driven plugins using OpenCode events | ✅ PAI-OpenCode | Native OpenCode feature |
| Custom branded UX wrapper | ❌ Open Arc | Product layer |

---

## Repository Separation

| Repository | Purpose |
|------------|---------|
| `Steffen025/pai-opencode` | Community port, open source, focused |
| `jeremaiah-ai/openark` | Commercial product, full vision, branded |

**No Cross-Contamination:**
- PAI-OpenCode never imports from Open Arc
- Open Arc may fork/reference PAI-OpenCode as base
- Clear documentation prevents user confusion

---

## Decision Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-03 | Scope separation defined | User realization that two projects were being conflated |
| 2026-03-03 | Removed WP6 (Voice) and WP8 (OMI) from v3.0 | Belong to Open Arc, not community port |
| 2026-03-03 | Scoped v3.0 to 6 WPs | Core port + native integrations only |

---

## For Contributors

**When contributing to PAI-OpenCode, ask:**
1. Does this use an OpenCode-native feature? (Should be yes)
2. Does this add a new abstraction layer? (Should be no)
3. Would this be useful to any OpenCode user, not just me? (Should be yes)
4. Is it in scope for a "PAI port" or is it "new product development"? (Should be port)

If the answer to #2 or #4 is "yes," the contribution likely belongs in Open Arc instead.

---

*Last updated: 2026-03-03*
*Maintained by: jeremAIah team*
