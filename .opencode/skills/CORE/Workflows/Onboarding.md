# Onboarding Workflow

**Trigger:** "onboarding", "personalize", "setup assistant", "configure identity", "first time setup"

## Purpose

**Stage 2 of PAI-OpenCode Setup** — Deep personalization after the Installation Wizard.

The `PAIOpenCodeWizard.ts` (Stage 1) sets up the basic configuration: provider, name, AI name, timezone. This workflow (Stage 2) goes deeper into your TELOS framework: mission, goals, values, beliefs, challenges.

**Why two stages?**
- Stage 1 (Wizard): Technical setup, ~2 minutes, runs BEFORE OpenCode
- Stage 2 (This): Deep personalization, 10-15 minutes, runs INSIDE OpenCode

This workflow creates the personal context files that make PAI truly yours.

---

## What Gets Configured

| Component | File | Purpose |
|-----------|------|---------|
| **TELOS** | `skills/CORE/USER/TELOS.md` | Your mission, goals, values, challenges |
| **Identity** | `skills/CORE/USER/DAIDENTITY.md` | AI name, personality, voice preferences |
| **Contacts** | `skills/CORE/USER/Contacts.md` | Important people in your life/work |
| **Stack** | `skills/CORE/USER/CoreStack.md` | Technology preferences |
| **Steering Rules** | `skills/CORE/USER/AISTEERINGRULES.md` | Custom AI behavior rules |

---

## Execution

### Phase 1: Welcome & Context

Start with:

```
Welcome to PAI-OpenCode personalization!

I'm going to ask you a series of questions to make this AI truly yours.
This usually takes 10-15 minutes and creates your personal context files.

You can skip any question by pressing Enter, and update these files anytime.

Ready to begin? (y/n)
```

### Phase 2: Identity Questions

Ask using AskUserQuestion tool with multiSelect where appropriate:

**Question 1: Your Name**
```
What should I call you?
(This is how I'll address you in conversations)
```

**Question 2: Your Location**
```
What's your timezone/location?
(Helps with time-aware responses)
Options:
1. Europe/Berlin
2. America/New_York
3. America/Los_Angeles
4. Other (specify)
```

**Question 3: AI Name**
```
What would you like to name your AI assistant?
Default: PAI
Examples: Jarvis, Friday, Max, Atlas, Sage
```

**Question 4: AI Personality**
```
What personality traits should your AI have?
(Select multiple - these affect communication style)
Options:
1. Direct & Efficient - No fluff, get to the point
2. Friendly & Warm - Conversational, supportive
3. Curious & Exploratory - Asks questions, suggests alternatives
4. Formal & Professional - Business-appropriate tone
5. Humorous & Witty - Light-hearted when appropriate
```

### Phase 3: TELOS - Your Personal Context

**Question 5: Your Mission**
```
What's your overarching life mission or purpose?
(This guides how I prioritize and frame advice)

Example: "Build technology that amplifies human creativity"
Example: "Create financial freedom while maintaining work-life balance"
Example: "Serve God through my work and family"
```

**Question 6: Current Focus Areas**
```
What are your main focus areas right now?
(Select multiple)
Options:
1. Career/Business Growth
2. Technical Skill Development
3. Health & Fitness
4. Family & Relationships
5. Financial Goals
6. Creative Projects
7. Spiritual Growth
8. Education/Learning
```

**Question 7: Current Goals**
```
What are your top 3 goals for this year?
(I'll help you track and achieve these)

Example:
1. Launch my SaaS product
2. Exercise 4x per week
3. Read 24 books
```

**Question 8: Challenges**
```
What challenges do you face that I should know about?
(Helps me give better advice)

Example:
- Time management - too many priorities
- Decision paralysis - hard to choose direction
- Procrastination on important tasks
```

**Question 9: Values**
```
What values guide your decisions?
(Select multiple)
Options:
1. Excellence - Do things right
2. Integrity - Do what's right
3. Growth - Always learning
4. Impact - Create value for others
5. Freedom - Autonomy in work/life
6. Faith - Spiritual foundation
7. Family - Relationships first
8. Efficiency - Leverage over labor
```

**Question 10: Anti-Goals**
```
What do you explicitly want to AVOID?
(I'll steer you away from these)

Example:
- Burnout - working myself into the ground
- Shiny object syndrome - chasing every new thing
- Trading time for money without leverage
```

### Phase 4: Technical Preferences

**Question 11: Primary Language**
```
What's your primary programming language?
Options:
1. TypeScript/JavaScript
2. Python
3. Go
4. Rust
5. Other
```

**Question 12: Work Context**
```
What kind of work do you primarily do?
(Select multiple)
Options:
1. Software Development
2. System Administration/DevOps
3. Data Science/ML
4. Product Management
5. Business/Entrepreneurship
6. Content Creation
7. Design
8. Research
```

### Phase 5: Generate Configuration Files

After collecting answers, generate the configuration files:

#### 1. TELOS.md

```markdown
# {USER_NAME}'s TELOS (PAI Personal Context)

> Personal context for PAI - enables deeply personalized AI guidance

---

## MISSION

{MISSION_ANSWER}

---

## CURRENT FOCUS

{FOCUS_AREAS as bullet list}

---

## GOALS ({CURRENT_YEAR})

### Professional
{PROFESSIONAL_GOALS}

### Personal
{PERSONAL_GOALS}

---

## CHALLENGES

{CHALLENGES as bullet list}

---

## VALUES & PRINCIPLES

{VALUES as bullet list with descriptions}

---

## ANTI-GOALS

{ANTI_GOALS as bullet list}

---

## CONTEXT

### Work Style
{WORK_CONTEXT_ANSWERS}

### Location & Timezone
{LOCATION_ANSWER}

---

*Generated via PAI-OpenCode Onboarding on {DATE}*
*Update anytime with: "update my TELOS"*
```

#### 2. DAIDENTITY.md

```markdown
# {AI_NAME} - Digital Assistant Identity

## Name
- **Short:** {AI_NAME}
- **Full:** {AI_NAME} - {USER_NAME}'s Personal AI

## Personality

{PERSONALITY_TRAITS with descriptions}

## Voice Style

{Based on personality selection}

## Communication Guidelines

- Address user as: {USER_NAME}
- Timezone: {TIMEZONE}
- Primary language: {LANGUAGE}

---

*Generated via PAI-OpenCode Onboarding*
```

#### 3. CoreStack.md

```markdown
# Technology Stack Preferences

## Primary Language
{LANGUAGE_ANSWER}

## Runtime & Tools
- **Package Manager:** bun
- **Runtime:** Bun
- **Markup:** Markdown

## Work Context
{WORK_CONTEXT_ANSWERS}

---

*Generated via PAI-OpenCode Onboarding*
```

### Phase 6: Write Files & Confirm

1. Write all generated files to `skills/CORE/USER/`
2. Show summary of what was created
3. Explain how to update these files later

```
🎉 Personalization complete!

I've created your personal context files:

✓ TELOS.md - Your mission, goals, and values
✓ DAIDENTITY.md - My ({AI_NAME}) identity configuration
✓ CoreStack.md - Your technology preferences

You can update these anytime by saying:
- "Update my TELOS"
- "Change AI personality"
- "Add a new goal"

Ready to work! What would you like to accomplish today?
```

---

## Quick Re-personalization

For users who want to update specific sections:

| Command | Action |
|---------|--------|
| "Update my goals" | Edit TELOS goals section |
| "Change AI name" | Update DAIDENTITY name |
| "Add a contact" | Append to Contacts.md |
| "Update my mission" | Edit TELOS mission section |
| "Full re-onboarding" | Run complete workflow again |

---

## Notes

- **Privacy:** All data stays local in your `.opencode/` directory
- **No Upload:** Nothing is sent externally - this is YOUR context
- **Editable:** All files are plain markdown - edit manually anytime
- **Portable:** Copy `skills/CORE/USER/` to migrate to new installations

---

## Example Session

```
User: "onboarding"

PAI: Welcome to PAI-OpenCode personalization! I'm going to ask you a
     series of questions to make this AI truly yours...

     What should I call you?

User: "Alex"

PAI: Nice to meet you, Alex! What would you like to name your AI assistant?
     [Shows options: PAI (default), Jarvis, Friday, custom...]

User: "Atlas"

PAI: Great choice! Atlas it is. What personality traits should I have?
     [Shows multiselect options...]

[... continues through all questions ...]

PAI: 🎉 Personalization complete!

     Hello Alex, I'm Atlas - your Personal AI assistant.

     I've learned that you're focused on [focus areas] and your mission is
     [mission]. I'll keep your values of [values] in mind as we work together.

     What would you like to accomplish today?
```

---

**Workflow Type:** Interactive Configuration
**Duration:** 10-15 minutes
**Destructive:** No (creates/updates USER files only)
**Requires User Input:** Yes (all questions)
