---
title: ADR-009 — Handler Audit: Claude-Code-spezifische Probleme und OpenCode-Fixes
status: Accepted
date: 2026-03-06
tags: [audit, plugin-system, opencode-adaptation, platform-migration]
---

# ADR-009: Handler Audit — Claude-spezifische Muster und OpenCode-Fixes

**Status:** Accepted  
**Date:** 2026-03-06  
**Context:** PR #A (WP3-Completion) — vollständiger Audit aller bestehenden Handler

---

## Hintergrund

Beim Portieren der neuen Hooks aus PAI v4.0.3 wurde erkannt, dass einige Hooks
stark Claude-Code-spezifisch sind und Anpassungen brauchen. Als Konsequenz wurde
ein vollständiger Audit ALLER bestehenden Handler durchgeführt.

**Audit-Methodik:** 5 Problemkategorien × 19 Handler

| Kategorie | Risiko | ADR |
|-----------|--------|-----|
| `console.log/error/warn` | TUI-Corruption | ADR-004 |
| `transcript_path` Referenzen | Claude-Hook-Pattern, kein OpenCode-Äquivalent | ADR-001 |
| `process.stdin` / `Bun.stdin` | Subprocess-Pattern, in Plugins sinnlos | ADR-001 |
| `process.exit()` | Subprocess-Exit, korrumpiert Plugin-Lifecycle | ADR-001 |
| `~/.claude` Pfade | Nicht adaptiert, weist auf falsches Directory | ADR-002 |

---

## Audit-Ergebnis: Handler-Matrix

| Handler | console.log | transcript_path | process.stdin | process.exit | ~/.claude | Bewertung |
|---------|------------|-----------------|---------------|--------------|-----------|-----------|
| `agent-capture.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `agent-execution-guard.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `algorithm-tracker.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `check-version.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `format-reminder.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `implicit-sentiment.ts` | ✅ | ⚠️ **ISSUE** | ✅ | ✅ | ✅ | **FIX NEEDED** |
| `integrity-check.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `isc-validator.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `learning-capture.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `observability-emitter.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `rating-capture.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `response-capture.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** (Kommentar-Ref) |
| `security-validator.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `skill-guard.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `skill-restore.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `tab-state.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** (Kitty-opt.) |
| `update-counts.ts` | ✅ | ✅ | ✅ | ⚠️ **MINOR** | ✅ | **MINOR FIX** |
| `voice-notification.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `work-tracker.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | **CLEAN** |

---

## Befunde im Detail

### 1. `implicit-sentiment.ts` — transcript_path (MEDIUM)

**Problem:** `handleImplicitSentiment()` akzeptiert einen `transcriptPath?: string` Parameter
und liest diesen als Claude-Code JSONL-Transcript (Format: `{type: "user"|"assistant", message: {...}}`).

**In OpenCode:** Dieser Pfad wird niemals übergeben (Aufruf in `pai-unified.ts` ohne
`transcriptPath`). Die Funktion `getRecentContext()` gibt bei fehlendem Pfad `''` zurück.

**Konsequenz:** Die Sentiment-Analyse läuft ohne Kontext (nur der aktuelle User-Prompt).
Das ist funktional — aber suboptimal. Die Gelegenheit, den vorherigen AI-Response als
Kontext zu nutzen, wird nicht genutzt.

**Fix:** `transcriptPath` Parameter durch `lastResponse?: string` ersetzen.
Wir können den letzten Response aus unserem neuen `last-response-cache.ts` lesen.

```typescript
// ALT (totes Param-Pattern):
handleImplicitSentiment(userText, sessionId, transcriptPath?)

// NEU (OpenCode-native):
handleImplicitSentiment(userText, sessionId, lastResponse?: string)
// lastResponse kommt aus: readLastResponse() aus last-response-cache.ts
```

**Auswirkung:** Sentiment-Qualität steigt, weil die Analyse den vorherigen Response kennt.

---

### 2. `update-counts.ts` — process.exit() in import.meta.main (MINOR)

**Problem:** 
```typescript
if (import.meta.main) {
  handleUpdateCounts().then(() => process.exit(0));
}
```

**In OpenCode:** Das Plugin wird als Modul importiert (niemals direkt ausgeführt).
`import.meta.main` ist daher immer `false`. Der Block ist dead code.

**Konsequenz:** Kein funktionales Problem — der Code läuft nie. Aber: Es ist
verwirrend und suggeriert ein Subprocess-Pattern.

**Fix:** Block entfernen oder durch Kommentar ersetzen der erklärt warum er
in OpenCode nicht benötigt wird.

---

### 3. `tab-state.ts` — Kitty-Abhängigkeit (INFO, kein Bug)

**Analyse:** Der Handler ist korrekt implementiert mit graceful degradation.
`isKittyAvailable()` prüft `KITTY_WINDOW_ID` env var und `which kitty`.
Wenn Kitty nicht vorhanden: silent skip, kein Fehler.

**Befund:** KEIN Bug. Die Kitty-Funktionalität ist optional und korrekt abgesichert.
Der Tab-Title-Persistence-Mechanismus (JSON state file) funktioniert unabhängig von Kitty.

**Empfehlung:** Keine Änderung nötig. Dokumentation könnte klarer sein.

---

### 4. `implicit-sentiment.ts` — transcriptPath in captureLowRatingLearning (MEDIUM)

**Zusätzliches Problem in `captureLowRatingLearning()`:**
```typescript
function captureLowRatingLearning(
  rating: number,
  sentimentSummary: string,
  detailedContext: string,
  transcriptPath: string  // ← Wird übergeben aber liest Claude-JSONL-Format
)
```

Die Funktion liest den Transcript um `responseContext` zu extrahieren:
```typescript
if (transcriptPath && existsSync(transcriptPath)) {
  const content = readFileSync(transcriptPath, 'utf-8');
  // Parsed als Claude-JSONL: {type: "assistant", message: {content: [...]}}
```

**In OpenCode:** `transcriptPath` ist immer leer (nie übergeben). Die `responseContext`
bleibt damit immer leer in den Learning-Dateien.

**Fix:** Statt `transcriptPath` → `lastResponse?: string` direkt übergeben.
Das ist präziser und OpenCode-native.

---

## Fixes in diesem PR

### Fix 1: `implicit-sentiment.ts` — transcriptPath → lastResponse

Ersetze `transcriptPath?: string` durch `lastResponse?: string` überall.

### Fix 2: `update-counts.ts` — import.meta.main Block entfernen

Dead code entfernen.

---

## Was KEIN Problem ist (explizit bestätigt)

- **console.log**: Kein einziger Handler verwendet `console.log/warn/error`. ADR-004 ist vollständig umgesetzt. ✅
- **process.stdin**: Kein Handler liest stdin. Kein Subprocess-Pattern. ✅  
- **~/.claude Pfade**: Alle Pfade gehen durch `getOpenCodeDir()` in `lib/paths.ts`. Nur Kommentare referenzieren `.claude/` als historische Herkunft. ✅
- **process.exit**: Nur in update-counts.ts `import.meta.main` Block (dead code, kein Bug). ✅
- **Kitty-Abhängigkeit**: Korrekt optional, graceful degradation überall. ✅

---

## Neue Handler (PR #A) — Audit-Status

| Neuer Handler | console.log | transcript_path | process.exit | OpenCode-native | Status |
|--------------|------------|-----------------|--------------|-----------------|--------|
| `prd-sync.ts` | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `session-cleanup.ts` | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `last-response-cache.ts` | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `relationship-memory.ts` | ✅ | ✅ | ✅ | ✅ | **CLEAN** |
| `question-tracking.ts` | ✅ | ✅ | ✅ | ✅ | **CLEAN** |

---

## Entscheidung

Zwei Fixes werden in PR #A durchgeführt:
1. `implicit-sentiment.ts`: `transcriptPath` → `lastResponse` (verbessert Qualität)
2. `update-counts.ts`: `import.meta.main` Block entfernen (dead code)

Alle anderen Handler sind korrekt adaptiert. Die ursprüngliche Port-Qualität war
für die wichtigen Punkte (ADR-004, kein stdin, kein process.exit) bereits gut.

---

*ADR-009 dokumentiert den Audit-Prozess und die Findings für zukünftige Contributor-Referenz.*
