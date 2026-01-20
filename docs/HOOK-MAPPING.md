# PAI 2.3 → OpenCode Hook Mapping Audit

**Datum:** 2026-01-20
**Effort Level:** DETERMINED
**Quelle:** Deep Wiki (anomalyco/opencode) + PAI 2.3 vendor/
**WARNUNG:** Dieses Dokument basierte ursprünglich auf dem FALSCHEN Repository (opencode-ai/opencode). Siehe RE-AUDIT-2026-01-20.md für korrekte Analyse.

---

## EXECUTIVE SUMMARY

### Kritisches Finding (Deep Wiki)

> **"User input flows directly from TUI editor to agent execution WITHOUT interception points."**

OpenCode hat **KEIN UserPromptSubmit-Äquivalent**. Dies ist eine fundamentale Architektur-Limitierung von OpenCode, nicht ein Versäumnis unserer Implementierung.

### Ergebnis

| Kategorie | PAI 2.3 Hooks | Portierbar nach OpenCode | Status |
|-----------|---------------|--------------------------|--------|
| **Vollständig portierbar** | 4 | 4 | ✅ |
| **Teilweise portierbar** | 4 | 4 (mit Workarounds) | ⚠️ |
| **NICHT portierbar** | 7 | 0 (OpenCode API fehlt) | ❌ |

---

## PAI 2.3 Hooks (17 Dateien)

### Nach Hook Event kategorisiert:

| Hook Event | PAI 2.3 Hooks | Anzahl |
|------------|---------------|--------|
| SessionStart | LoadContext, CheckVersion, StartupGreeting | 3 |
| **UserPromptSubmit** | FormatEnforcer, AutoWorkCreation, ExplicitRatingCapture, ImplicitSentimentCapture, UpdateTabTitle | **5** |
| PreToolUse | SecurityValidator, SetQuestionTab | 2 |
| PostToolUse | QuestionAnswered | 1 |
| Stop | StopOrchestrator | 1 |
| SessionEnd | WorkCompletionLearning, SessionSummary | 2 |
| SubagentStop | AgentOutputCapture | 1 |

---

## DETAILLIERTES MAPPING

### ✅ VOLLSTÄNDIG PORTIERBAR (4 Hooks)

| PAI 2.3 Hook | OpenCode Event | Unified Plugin | Status |
|--------------|----------------|----------------|--------|
| **LoadContext.hook.ts** | `experimental.chat.system.transform` | ✅ context-loader.ts | IMPLEMENTIERT |
| **SecurityValidator.hook.ts** | `tool.execute.before` + throw | ✅ security-validator.ts | IMPLEMENTIERT |
| **CheckVersion.hook.ts** | `experimental.chat.system.transform` | ⏳ Kann ergänzt werden | MÖGLICH |
| **StartupGreeting.hook.ts** | `experimental.chat.system.transform` | ⏳ Kann ergänzt werden | MÖGLICH |

### ⚠️ TEILWEISE PORTIERBAR (4 Hooks)

| PAI 2.3 Hook | OpenCode Event | Workaround | Status |
|--------------|----------------|------------|--------|
| **StopOrchestrator.hook.ts** | `event` (session.idle) | Session-Idle erkennen, Voice/Capture auslösen | WORKAROUND MÖGLICH |
| **WorkCompletionLearning.hook.ts** | `event` (session.idle) | Bei Session-Ende Learning extrahieren | WORKAROUND MÖGLICH |
| **SessionSummary.hook.ts** | `event` (session.idle) | Bei Session-Ende Summary generieren | WORKAROUND MÖGLICH |
| **AgentOutputCapture.hook.ts** | `tool.execute.after` (tool=Task) | Task-Tool-Completion filtern | WORKAROUND MÖGLICH |

### ❌ NICHT PORTIERBAR (7 Hooks)

| PAI 2.3 Hook | Benötigt | OpenCode Status | Grund |
|--------------|----------|-----------------|-------|
| **FormatEnforcer.hook.ts** | UserPromptSubmit | ❌ EXISTIERT NICHT | Kein User-Input Interception |
| **AutoWorkCreation.hook.ts** | UserPromptSubmit | ❌ EXISTIERT NICHT | Kein User-Input Interception |
| **ExplicitRatingCapture.hook.ts** | UserPromptSubmit | ❌ EXISTIERT NICHT | Kein User-Input Interception |
| **ImplicitSentimentCapture.hook.ts** | UserPromptSubmit | ❌ EXISTIERT NICHT | Kein User-Input Interception |
| **UpdateTabTitle.hook.ts** | UserPromptSubmit | ❌ EXISTIERT NICHT | Kein User-Input Interception |
| **SetQuestionTab.hook.ts** | PreToolUse (AskUserQuestion) | ⚠️ Theoretisch möglich | Nicht implementiert |
| **QuestionAnswered.hook.ts** | PostToolUse (AskUserQuestion) | ⚠️ Theoretisch möglich | Nicht implementiert |

---

## OPENCODE PLUGIN API (Deep Wiki verifiziert)

### Verfügbare Events

| Event | Beschreibung | PAI-Äquivalent |
|-------|--------------|----------------|
| `experimental.chat.system.transform` | System-Prompt modifizieren | SessionStart |
| `tool.execute.before` | Vor Tool-Ausführung | PreToolUse |
| `tool.execute.after` | Nach Tool-Ausführung | PostToolUse |
| `permission.ask` | Permission-Anfrage | PreToolUse (confirm) |
| `event` (session.created) | Session erstellt | SessionStart |
| `event` (session.idle) | Session inaktiv | Stop/SessionEnd |

### NICHT VERFÜGBAR in OpenCode

| Feature | Status | Impact |
|---------|--------|--------|
| **UserPromptSubmit** | ❌ EXISTIERT NICHT | 5 PAI Hooks nicht portierbar |
| **User Input Interception** | ❌ EXISTIERT NICHT | Keine Middleware vor Agent |
| **Tab/Title API** | ❌ NICHT EXPONIERT | Tab-Updates nicht möglich |

---

## UNIFIED PLUGIN COVERAGE

### pai-unified.ts implementiert:

```typescript
// ✅ IMPLEMENTIERT
"experimental.chat.system.transform" → LoadContext (context-loader.ts)
"tool.execute.before" → SecurityValidator (security-validator.ts)
"tool.execute.after" → PostToolUse Framework (Future: Learning)
"permission.ask" → Security Confirmation
"event" → Session Lifecycle (Future: Stop/SessionEnd)
```

### Abdeckung

| Kategorie | Hooks | Implementiert | Mit Workaround | Nicht möglich |
|-----------|-------|---------------|----------------|---------------|
| SessionStart | 3 | 1 ✅ | +2 möglich | 0 |
| PreToolUse | 2 | 1 ✅ | +1 möglich | 0 |
| PostToolUse | 1 | 0 | +1 möglich | 0 |
| Stop/SessionEnd | 3 | 0 | +3 möglich | 0 |
| SubagentStop | 1 | 0 | +1 möglich | 0 |
| **UserPromptSubmit** | **5** | **0** | **0** | **5** ❌ |

**Gesamt:** 15 Hooks
- Implementiert: 2 (13%)
- Mit Workaround möglich: 8 (53%)
- **NICHT MÖGLICH wegen OpenCode API:** 5 (33%)

---

## EMPFEHLUNG FÜR v1.0

### Option C ist MÖGLICH mit Einschränkungen

Da 67% der PAI 2.3 Hooks portierbar sind (implementiert oder mit Workaround möglich), ist ein "Full Feature v1.0" möglich - **ABER** mit dokumentierten Einschränkungen:

### v1.0 Release mit "Known Limitations"

**Was funktioniert:**
- ✅ Context Injection (CORE Skill laden)
- ✅ Security Blocking (gefährliche Commands blocken)
- ✅ Skills System (20 Skills)
- ✅ Agent System (13 Agents)
- ✅ Converter Tool

**Was NICHT funktioniert (OpenCode API Limitation):**
- ❌ Format Enforcement (kein UserPromptSubmit)
- ❌ Auto Work Creation (kein UserPromptSubmit)
- ❌ Rating Capture (kein UserPromptSubmit)
- ❌ Sentiment Analysis (kein UserPromptSubmit)
- ❌ Tab Title Updates (kein Tab API)

**Was mit Future-Implementation möglich ist:**
- ⏳ Stop/Session-End Handling (via session.idle)
- ⏳ Agent Output Capture (via tool.execute.after)
- ⏳ Learning Capture (via tool.execute.after)

---

## FAZIT

**OpenCode hat eine fundamentale Architektur-Einschränkung:** Kein User-Input-Interception.

Das bedeutet:
1. **33% der PAI 2.3 Hooks können NIEMALS portiert werden** (außer OpenCode ändert ihre API)
2. **67% der Hooks sind portierbar** (2 implementiert, 8 mit Workaround möglich)
3. **Die Dokumentation "6 core plugin equivalents" war historisch korrekt** (vor PAI 2.3 Realignment)

**v1.0 Release ist empfohlen** mit:
- Korrigierter Dokumentation
- "Known Limitations" Section
- Klarer Kommunikation was OpenCode-spezifisch nicht möglich ist

---

*Audit durchgeführt mit THE ALGORITHM (DETERMINED Level) + Deep Wiki (anomalyco/opencode)*
*HINWEIS: Ursprüngliches Audit verwendete falsches Repository - siehe RE-AUDIT-2026-01-20.md*
