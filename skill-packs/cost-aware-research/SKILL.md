---
name: Research
description: Comprehensive research and content extraction. USE WHEN research, investigate, extract wisdom, analyze content. For OSINT use OSINT skill.
context: fork
---

## Customization

**Before executing, check for user customizations at:**
`~/.opencode/skills/CORE/USER/SKILLCUSTOMIZATIONS/Research/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# Research Skill

Comprehensive research, analysis, and content extraction system.

## MANDATORY: URL Verification

**READ:** `UrlVerificationProtocol.md` - Every URL must be verified before delivery.

Research agents hallucinate URLs. A single broken link is a catastrophic failure.

---

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the Research skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **Research** skill...
   ```

## Workflow Routing

Route to the appropriate workflow based on the request.

**CRITICAL:** For due diligence, company/person background checks, or vetting -> **INVOKE OSINT SKILL INSTEAD**

### Research Modes (Primary Workflows)
- Quick research - **DEFAULT** (1 Claude, FREE) → `Workflows/QuickResearch.md`
- Standard research (3 agents: Claude + Gemini + Perplexity Sonar, ~$0.01) → `Workflows/StandardResearch.md`  
  Trigger: "standard research", "thorough research", "research X from multiple angles"
- Extensive research (4-5 providers, flexible angles, ~$0.10-0.50) → `Workflows/ExtensiveResearch.md`
  Trigger: "extensive research" - **REQUIRES USER CONFIRMATION**

### Deep Content Analysis
- Extract alpha / deep analysis / highest-alpha insights -> `Workflows/ExtractAlpha.md`

### Content Retrieval
- Difficulty accessing content (CAPTCHA, bot detection, blocking) -> `Workflows/Retrieve.md`
- YouTube URL extraction (use `fabric -y URL` immediately) -> `Workflows/YoutubeExtraction.md`
- Web scraping -> `Workflows/WebScraping.md`

### Specific Research Types
- Claude WebSearch only (free, no API keys) -> `Workflows/ClaudeResearch.md`
- Perplexity API research (use Quick for single-agent) -> `Workflows/QuickResearch.md`
- Interview preparation (Tyler Cowen style) -> `Workflows/InterviewResearch.md`
- AI trends analysis -> `Workflows/AnalyzeAiTrends.md`

### Fabric Pattern Processing
- Use Fabric patterns (242+ specialized prompts) -> `Workflows/Fabric.md`

### Content Enhancement
- Enhance/improve content -> `Workflows/Enhance.md`
- Extract knowledge from content -> `Workflows/ExtractKnowledge.md`

---

## Quick Reference

**READ:** `QuickReference.md` for detailed examples and mode comparison.

| Trigger | Mode | Agents | Cost | Speed |
|---------|------|--------|------|-------|
| "research X" (default) | Quick | 1 Claude | **$0 FREE** | ~10-15s |
| "standard research" | Standard | 3 (Claude+Gemini+Perplexity) | ~$0.01 | ~15-30s |
| "extensive research" | Extensive | 4-15 (flexible) | ~$0.10-0.50 | ~60-120s |

---

## Integration

### Feeds Into
- **blogging** - Research for blog posts
- **newsletter** - Research for newsletters
- **xpost** - Create posts from research

### Uses
- **be-creative** - deep thinking for extract alpha
- **OSINT** - MANDATORY for company/people comprehensive research
- **BrightData MCP** - CAPTCHA solving, advanced scraping
- **Apify MCP** - RAG browser, specialized site scrapers

---

## File Organization

**Scratch (temporary work artifacts):** `~/.opencode/MEMORY/WORK/{current_work}/scratch/`
- Read `~/.opencode/MEMORY/STATE/current-work.json` to get the `work_dir` value
- All iterative work artifacts go in the current work item's scratch/ subdirectory
- This ties research artifacts to the work item for learning and context

**History (permanent):** `~/.opencode/History/research/YYYY-MM/YYYY-MM-DD_[topic]/`
