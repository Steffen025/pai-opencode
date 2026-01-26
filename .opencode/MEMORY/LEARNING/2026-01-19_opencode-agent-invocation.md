# OpenCode Agent Invokation - Zwei Kontexte

**Datum:** 2026-01-19
**Kontext:** PAI-OpenCode v0.9 Testing
**Status:** VERIFIED (durch manuelle Tests bestätigt)

## Das Problem

Die ursprüngliche Dokumentation (PAIAGENTSYSTEM.md) war **falsch**:
- Behauptete: `Task({subagent_type: "Architect"})` funktioniert NICHT
- Behauptete: `@agentname` ist der primäre Weg für AI-Delegation

## Die Wahrheit (verifiziert durch Tests)

### AI-zu-Agent Delegation

```typescript
// ✅ FUNKTIONIERT - Task tool mit subagent_type
Task({ subagent_type: "Intern", prompt: "..." })     // Klickbare Session
Task({ subagent_type: "Architect", prompt: "..." })  // Klickbare Session
Task({ subagent_type: "Engineer", prompt: "..." })   // Klickbare Session

// ❌ FUNKTIONIERT NICHT - @syntax im AI-Response
@intern research X    // Ist nur TEXT, kein Aufruf!
```

### User-zu-Agent Delegation

```
// ✅ FUNKTIONIERT - User tippt in Input-Zeile
@intern research TypeScript
@architect design a system
```

## Zusammenfassung

| Wer | Methode | Funktioniert? |
|-----|---------|---------------|
| **AI** | `Task({subagent_type: "Name"})` | ✅ Ja |
| **AI** | `@agentname` im Response | ❌ Nein (nur Text) |
| **User** | `@agentname` im Input | ✅ Ja |

## Verfügbare subagent_types

Alle diese funktionieren mit dem Task tool:
- `Intern` (Haiku)
- `Architect` (Sonnet)
- `Engineer` (Sonnet)
- `Designer` (Sonnet)
- `Pentester` (Sonnet)
- `Researcher` (Sonnet)
- `Explore` (Native)
- `Plan` (Native)
- `general-purpose` (Native)

## Key Takeaway

**Für AI-Delegation: IMMER Task tool verwenden, NIEMALS @syntax!**

```typescript
// So macht man es richtig:
Task({
  subagent_type: "Architect",
  prompt: "Design a caching system..."
})
```

---

*Verifiziert: 2026-01-19 durch manuelle Tests in OpenCode*
