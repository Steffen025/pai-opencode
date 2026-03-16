---
name: USMetrics
description: US metrics, economic indicators and data tracking. USE WHEN US metrics, American data, statistics, demographics, GDP, inflation, unemployment, economic metrics, gas prices.
triggers:
  - "US metrics"
  - "American data"
  - "statistics"
  - "demographics"
  - "GDP"
  - "inflation"
  - "unemployment"
  - "economic metrics"
  - "gas prices"
---

# USMetrics - US Metrics and Data Tracking

**Category for skills that track and analyze US-specific metrics and data.**

## Skills in This Category

| Skill | Purpose | Trigger |
|-------|---------|---------|
| **USMetrics** | US-specific metrics, economic indicators and data tracking | "US metrics", "American data", "statistics", "GDP", "inflation", "unemployment", "economic metrics", "gas prices", "demographics" |

## When to Use

- Tracking US-specific metrics and statistics
- Analyzing American demographic data
- Monitoring US trends and indicators
- Economic analysis (GDP, inflation, unemployment)

## Category Philosophy

USMetrics provides focused tracking for US-specific data points and trends.

## Customization

**MANDATORY:** Before executing, check for user customizations at:
`~/.opencode/skills/PAI/USER/SKILLCUSTOMIZATIONS/USMetrics/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the USMetrics skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```text
   Running the **WorkflowName** workflow in the **USMetrics** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

## OPTIONAL: Additional Setup

- Configure data directory path in `Preferences.md`
- Set API keys in environment variables

## Workflow Routing

**When executing a workflow, output this notification directly:**

```text
Running the **WorkflowName** workflow in the **USMetrics** skill to ACTION...
```

### Available Workflows

| Workflow | Description | Use When |
|----------|-------------|----------|
| **UpdateData** | Fetch live data from APIs and update Substrate dataset | "Update metrics", "refresh data", "pull latest", "update Substrate" |
| **GetCurrentState** | Comprehensive economic overview with multi-timeframe trend analysis | "How is the economy?", "economic overview", "get current state", "US metrics analysis" |

## Workflows

### UpdateData

**Full documentation:** `Workflows/UpdateData.md`

**Purpose:** Fetch live data from FRED, EIA, Treasury APIs and populate the Substrate US-Common-Metrics dataset files. This must run before GetCurrentState to ensure data is current.

**Execution:**
```bash
bun ~/.opencode/skills/USMetrics/Tools/update-substrate-metrics.ts
```

**Outputs:**
- `US-Common-Metrics.md` - Updated with current values
- `us-metrics-current.csv` - Machine-readable snapshot
- `us-metrics-historical.csv` - Appended time series

**Trigger phrases:**
- "Update the US metrics"
- "Refresh the economic data"
- "Pull latest metrics"
- "Update Substrate dataset"

---

### GetCurrentState

**Full documentation:** `Workflows/GetCurrentState.md`

**Produces:** A comprehensive overview document analyzing:
- 10-year, 5-year, 2-year, and 1-year trends for all major metrics
- Cross-category interplay analysis
- Pattern detection and anomalies
- Research recommendations

**Trigger phrases:**
- "How is the US economy doing?"
- "Give me an economic overview"
- "What's the current state of US metrics?"
- "Analyze economic trends"
- "US metrics report"

## Metric Categories Covered

1. **Economic Output & Growth** - GDP, industrial production, retail sales
2. **Inflation & Prices** - CPI, PCE, gas prices, oil prices
3. **Employment & Labor** - Unemployment, payrolls, jobless claims, quit rate
4. **Housing** - Home prices, mortgage rates, housing starts
5. **Consumer & Personal Finance** - Sentiment, saving rate, credit
6. **Financial Markets** - Interest rates, Treasury yields, volatility
7. **Trade & International** - Trade balance, USD index
8. **Government & Fiscal** - Federal debt, budget deficit, spending
9. **Demographics & Social** - Population, inequality, poverty
10. **Health & Crisis** - Deaths of despair, air quality, life expectancy

## API Keys Required

For live data fetching:
- `FRED_API_KEY` - Federal Reserve Economic Data
- `EIA_API_KEY` - Energy Information Administration

## Tools

| Tool | Purpose |
|------|---------|
| `Tools/update-substrate-metrics.ts` | **Primary** - Fetch all metrics, update Substrate files |
| `Tools/fetch-fred-series.ts` | Fetch historical data from FRED API |
| `Tools/GenerateAnalysis.ts` | Generate analysis report from Substrate data |

## Example Usage

```text
User: "How is the US economy doing? Give me a full analysis."

→ Invoke UpdateData workflow (fetch latest data from APIs)
→ Invoke GetCurrentState workflow
→ Calculate 10y/5y/2y/1y trends
→ Analyze cross-metric correlations
→ Identify patterns and anomalies
→ Generate research recommendations
→ Output comprehensive markdown report
```

## Output Format

The GetCurrentState workflow produces a structured markdown document:

```markdown
# US Economic State Analysis
**Generated:** [timestamp]
**Data Sources:** FRED, EIA, Treasury, BLS, Census

## Executive Summary
[Key findings in 3-5 bullets]

## Trend Analysis by Category
### Economic Output
[10y/5y/2y/1y trends with analysis]
...

## Cross-Metric Analysis
[Correlations, leading indicators, divergences]

## Pattern Detection
[Anomalies, regime changes, emerging trends]

## Research Recommendations
[Suggested areas for deeper investigation]
```
