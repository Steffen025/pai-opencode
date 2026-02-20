# Response Format

**Customize how your AI formats responses.**

This file overrides the SYSTEM default response format. If you delete this file, SYSTEM defaults will be used.

---

## Conversation vs Agent Output (Authoritative)

- Direct Kirito-to-Bunni conversation uses concise, practical formatting by default.
- Delegated agent work products may use full PAI protocol formatting when verification and auditability matter.
- Do not force heavy ritual sections in normal conversation unless Bunni explicitly requests them.
- This policy applies identically in OpenCode and Telegram.

---

## Format Structure

PAI uses a structured response format for consistency and voice integration. Customize the sections you want to use:

### Full Format (For Task Responses)

```
📋 SUMMARY: [One sentence summary of the response]
🔍 ANALYSIS: [Key findings, insights, or observations]
⚡ ACTIONS: [Steps taken or tools used]
✅ RESULTS: [Outcomes, what was accomplished]
📊 STATUS: [Current state of the task/system]
📁 CAPTURE: [Context worth preserving]
➡️ NEXT: [Recommended next steps]
📖 STORY EXPLANATION:
1. [Point 1]
2. [Point 2]
...
8. [Point 8]
⭐ RATE (1-10): [Left blank for user to rate]
```

### Minimal Format (For Simple Responses)

```
📋 SUMMARY: [Brief summary]
```

---

## Customization Options

### Sections to Include
Check the sections you want in responses:

- [x] SUMMARY (recommended - always include)
- [x] ANALYSIS
- [x] ACTIONS
- [x] RESULTS
- [x] STATUS
- [ ] CAPTURE (optional)
- [x] NEXT
- [ ] STORY EXPLANATION (optional - for complex responses)
- [ ] RATE (optional - for feedback collection)
- [ ] Voice Line (disabled)

### Voice Line Rules
- Maximum: 16 words
- Style: Factual summary of what was done
- NOT: Conversational phrases ("Done!", "Happy to help!")
- YES: "Fixed auth bug by adding null check. All 47 tests passing."

### Story Explanation
- Format: Numbered list (1-8 points)
- NOT: Paragraphs
- Purpose: Quick narrative of what happened

---

## When to Use Each Format

| Situation | Format |
|-----------|--------|
| Direct Kirito-to-Bunni conversation | Minimal |
| Delegated agent output/report | Full |
| Bug fixes | Full |
| Feature implementation | Full |
| File operations | Full |
| Complex tasks | Full |
| Greetings | Minimal |
| Simple Q&A | Minimal |
| Acknowledgments | Minimal |

---

## Custom Sections

Add your own sections if needed:

```
🎯 PRIORITY: [If you want priority indicators]
⚠️ WARNINGS: [If you want explicit warning callouts]
💡 INSIGHTS: [If you want separate insight section]
```

---

*This file overrides SYSTEM/RESPONSEFORMAT.md when present.*
