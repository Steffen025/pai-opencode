# Quick Research Workflow

**Mode:** Single researcher, 1 query | **Timeout:** 30 seconds

## When to Use

- User says "quick research" or "minor research"
- Simple, straightforward queries
- Time-sensitive requests
- Just need a fast answer

## Agent Selection

| Topic Type | Best Agent | Why | Cost |
|------------|------------|-----|------|
| **Default** | `ClaudeResearcher` | Academic depth, FREE | $0 |
| Breaking news (last hour) | `PerplexityResearcher` | Real-time search | ~$0.01 |
| **Technical, scholarly** | `ClaudeResearcher` | Academic depth | $0 |

## Workflow

### Step 1: Launch Single Agent

**ONE Task call - choose based on topic:**

```typescript
// DEFAULT - Claude (FREE, academic depth)
Task({
  subagent_type: "ClaudeResearcher",
  description: "[topic] quick lookup",
  prompt: "Do ONE web search for: [query]. Return the key findings immediately. Keep it brief and factual."
})

// For breaking news ONLY (last hour events)
Task({
  subagent_type: "PerplexityResearcher",
  description: "[topic] quick lookup",
  prompt: "Do ONE web search for: [query]. Return the key findings immediately. Keep it brief and factual."
})
```

**Prompt requirements:**
- Single, well-crafted query
- Instruct to return immediately after first search
- No multi-query exploration

### Step 2: Return Results

Report findings using standard format:

```markdown
📋 SUMMARY: Quick research on [topic]
🔍 ANALYSIS: [Key findings from Claude]
⚡ ACTIONS: 1 Claude query
✅ RESULTS: [Answer]
📊 STATUS: Quick mode - 1 agent, 1 query | Cost: $0 (FREE)
📁 CAPTURE: [Key facts]
➡️ NEXT: [Suggest standard research if more depth needed]
📖 STORY EXPLANATION: [3-5 numbered points - keep brief]
🎯 COMPLETED: Quick answer on [topic]
```

## Speed Target

~10-15 seconds for results
