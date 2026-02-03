# Extensive Research Workflow

**Mode:** 4-5 providers × 1-3 angles each | **Timeout:** 5 minutes | **Cost:** ~$0.10-0.50

## 🚨 CRITICAL: URL Verification Required

**BEFORE delivering any research results with URLs:**
1. Verify EVERY URL using WebFetch or curl
2. Confirm the content matches what you're citing
3. NEVER include unverified URLs - research agents HALLUCINATE URLs
4. A single broken link is a CATASTROPHIC FAILURE

See `SKILL.md` for full URL Verification Protocol.

## 🚨 COST GATE - MANDATORY CONFIRMATION

**BEFORE executing this workflow, display to user:**

"⚠️ EXTENSIVE RESEARCH COST WARNING

This workflow uses 4-5 providers with 1-3 angles each:
- ClaudeResearcher (1-3 angles) → $0 FREE
- GeminiResearcher (1-3 angles) → ~$0.01-0.03
- GrokResearcher (1-3 angles) → ~$0.02-0.10
- PerplexityProResearcher (1-3 angles) → ~$0.05-0.15
- CodexResearcher (optional, technical topics) → ~$0.03-0.10

Estimated total cost: $0.10-0.50

Proceed with extensive research? [Y/n]"

**WAIT for explicit user confirmation before continuing.**
**If user declines, suggest Standard Research instead.**

## When to Use

- User says "extensive research" or "do extensive research"
- Deep-dive analysis needed
- Comprehensive multi-domain coverage required
- The "big daddy" research mode

## Workflow

### Step 0: Generate Creative Research Angles (deep thinking)

**Use deep thinking to generate diverse research angles:**

Think deeply about the research topic:
- Explore multiple unusual perspectives and domains
- Question assumptions about what's relevant
- Make unexpected connections across fields
- Consider edge cases, controversies, emerging trends

Generate 1-3 unique angles per researcher type based on topic breadth (see Step 1).

### Step 1: Determine Angle Count Based on Topic

**Guidelines for angle selection:**

| Topic Type | Angles per Provider | Total Agents | Example |
|------------|---------------------|--------------|---------|
| Focused/specific | 1 | 4-5 | "Bug in React 18 hydration" |
| Standard breadth | 2 | 8-10 | "AI regulation trends" |
| Broad/controversial | 3 | 12-15 | "Future of work with AI" |

**Provider Selection:**
- ALWAYS: Claude, Gemini, Grok, PerplexityPro
- OPTIONAL: Codex (add if topic is technical/code-related)

### Step 2: Launch All Research Agents in Parallel

**SINGLE message launching all providers with appropriate thread count:**

```typescript
// ALWAYS included (4 providers minimum):

// Claude - academic depth (1-3 angles)
Task({ subagent_type: "ClaudeResearcher", description: "[topic] angle 1", prompt: "Search for: [angle 1]. Return findings." })
// Add more angles if needed based on topic breadth

// Gemini - multi-perspective (1-3 angles)
Task({ subagent_type: "GeminiResearcher", description: "[topic] angle X", prompt: "Search for: [angle X]. Return findings." })
// Add more angles if needed

// Grok - contrarian/social (1-3 angles)
Task({ subagent_type: "GrokResearcher", description: "[topic] angle Y", prompt: "Search for: [angle Y]. Return findings." })
// Add more angles if needed

// Perplexity Pro - deep real-time (1-3 angles)
// NOTE: PerplexityPROResearcher, not PerplexityResearcher!
Task({ subagent_type: "PerplexityProResearcher", description: "[topic] angle Z", prompt: "Search for: [angle Z]. Return findings." })
// Add more angles if needed

// OPTIONAL - add for technical topics:
// Task({ subagent_type: "CodexResearcher", description: "[topic] technical", prompt: "..." })
```

**Each agent:**
- Gets ONE focused angle
- Does 1-2 searches max
- Returns as soon as it has findings

### Step 3: Collect Results (5 MINUTE TIMEOUT)

- Agents run in parallel
- Most return within 30-90 seconds
- **HARD TIMEOUT: 5 minutes** - proceed with whatever has returned
- Note non-responsive agents

### Step 4: Comprehensive Synthesis

**Synthesis requirements:**
- Identify themes across all research angles (4-15 depending on topic)
- Cross-validate findings from multiple sources
- Highlight unique insights from each researcher type
- Note where sources agree (high confidence)
- Flag conflicts or gaps

**Report structure:**
```markdown
## Executive Summary
[2-3 sentence overview]

## Key Findings
### [Theme 1]
- Finding (confirmed by: claude, gemini, perplexity-pro)
- Finding (source: grok)

### [Theme 2]
...

## Unique Insights by Source
- **Claude**: [analytical depth]
- **Gemini**: [cross-domain connections]
- **Grok**: [contrarian perspectives]
- **Perplexity Pro**: [deep real-time intelligence]
- **Codex** (if used): [technical analysis]

## Conflicts & Uncertainties
[Note disagreements]
```

### Step 5: VERIFY ALL URLs (MANDATORY)

**Before delivering results, verify EVERY URL:**

```bash
# For each URL returned by agents:
curl -s -o /dev/null -w "%{http_code}" -L "URL"
# Must return 200

# Then verify content:
WebFetch(url, "Confirm article exists and summarize main point")
# Must return actual content, not error
```

**If URL fails verification:**
- Remove it from results
- Find alternative source via WebSearch
- Verify the replacement URL
- NEVER include unverified URLs

**Extensive mode generates MANY URLs - allocate time for verification.**

### Step 6: Return Results

```markdown
📋 SUMMARY: Extensive research on [topic]
🔍 ANALYSIS: [Comprehensive findings by theme]
⚡ ACTIONS: [N] parallel agents across 4-5 providers
✅ RESULTS: [Full synthesized report]
📊 STATUS: Extensive mode - [N] agents, 5 min timeout
📁 CAPTURE: [Key discoveries]
➡️ NEXT: [Follow-up recommendations]
📖 STORY EXPLANATION: [8 numbered points]
🎯 COMPLETED: Extensive research on [topic] complete

📈 RESEARCH METRICS:
- Providers Used: [list - e.g., Claude, Gemini, Grok, PerplexityPro, Codex]
- Total Agents: [N] ([breakdown - e.g., 3 Claude + 2 Gemini + 2 Grok + 2 PerplexityPro])
- Estimated Cost: $[X.XX]
- Confidence Level: [%]
```

## Speed Target

~60-90 seconds for results (parallel execution)
