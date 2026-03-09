# PAI-OpenCode Installer Refactor Plan

> **Status:** Draft — To be executed in PR #46 alongside CodeRabbit fixes  
> **Goal:** One Electron GUI entry point for both new and existing users  
> **Author:** Jeremy (WP-D post-analysis)

---

## 1. Problem Statement

### Current Mess (3 Einstiegspunkte)

```
install.sh          ← Bootstrap-Skript (Bash)
  └── startet main.ts
        ├── PAI-Install/cli/    ← TUI-Installer (Terminal)
        └── PAI-Install/web/    ← Web-Server für Electron

PAI-Install/electron/main.js  ← GUI-Wrapper (3. Weg)

.opencode/PAIOpenCodeWizard.ts ← BISHERIGER Installer (4. Weg!)
tools/migration-v2-to-v3.ts   ← Migration als separates Script
```

**Das eigentliche Problem:** Die Build-Logik für die OpenCode Binary (clone Fork → checkout feature/model-tiers → bun build) lebt im `PAIOpenCodeWizard.ts`, nicht in PAI-Install. Der Electron-Installer weiß davon nichts.

### Was User aktuell erleben:

```
Neuer User:
  1. Liest README → "Run installer"
  2. Findet: install.sh? electron? wizard? 
  3. Verwirrung. Welches soll ich nehmen?

Existing v2 User:
  1. Liest UPGRADE.md
  2. Soll migration script laufen
  3. Und separat Installer?
  4. Verwirrung.
```

---

## 2. Zielbild: Ein Einstiegspunkt

```
bash PAI-Install/install.sh    ← EINZIGER Einstieg
     │
     └── Startet Electron GUI
           │
           ├── AUTO-DETECT: ~/.opencode existiert?
           │     ├── JA  → "Update/Migrate" Flow
           │     └── NEIN → "Fresh Install" Flow
           │
           ├── Fresh Install Flow:
           │     1. Welcome & Prerequisites
           │     2. Build OpenCode Binary (Fork + model-tiers)
           │     3. Provider-Preset (Anthropic/ZEN PAID/ZEN FREE/Ollama)
           │     4. Identity (Name, AI-Name, Timezone)
           │     5. API Keys (Anthropic, ElevenLabs)
           │     6. Install PAI Files
           │     7. Done ✓
           │
           └── Update/Migrate Flow:
                 1. Detected: PAI-OpenCode v[X] → v3.0
                 2. Backup erstellen
                 3. Struktur migrieren (flat → hierarchical)
                 4. OpenCode Binary update (optional)
                 5. Settings beibehalten
                 6. Done ✓
```

---

## 3. Neue PAI-Install Struktur

### Target (vereinfacht)

```
PAI-Install/
├── install.sh              ← bootstrap: check bun → launch electron
├── README.md               ← docs
│
├── electron/               ← PRIMÄRER ENTRY POINT
│   ├── main.js             ← Electron main process (start bun server)
│   ├── package.json
│   └── package-lock.json
│
├── engine/                 ← SHARED LOGIC (GUI + CLI nutzen das)
│   ├── detect.ts           ← System detection + PAI version detection
│   ├── build-opencode.ts   ← NEU: Build Fork binary (aus PAIOpenCodeWizard portiert)
│   ├── actions.ts          ← Install/Migration actions
│   ├── migrate.ts          ← NEU: v2→v3 Migration (aus tools/ portiert)
│   ├── config-gen.ts       ← Settings/opencode.json generation
│   ├── state.ts            ← Installer state machine
│   ├── steps-install.ts    ← NEU: Steps für Fresh Install flow
│   ├── steps-migrate.ts    ← NEU: Steps für Migrate flow
│   └── types.ts
│
├── web/                    ← Web UI (served by bun, rendered in Electron)
│   ├── server.ts
│   ├── routes.ts
│   └── public/
│       ├── index.html      ← Single Page App entry
│       ├── styles.css
│       ├── app.js          ← UI logic
│       └── assets/
│
└── cli/                    ← HEADLESS ALTERNATIVE (CI/CD, Homeserver, etc.)
    └── quick-install.ts    ← Non-interactive fast-path (kein TUI)
```

### Was entfällt

| Datei | Warum entfällt |
|-------|---------------|
| `cli/display.ts` | TUI-rendering → ersetzt durch Electron UI |
| `cli/index.ts` | Interaktiver TUI-Flow → ersetzt durch Electron UI |
| `cli/prompts.ts` | Terminal-Prompts → ersetzt durch Electron Forms |
| `engine/steps.ts` | Ersetzt durch `steps-install.ts` + `steps-migrate.ts` |
| `tools/migration-v2-to-v3.ts` | Integriert in `engine/migrate.ts` |
| `.opencode/PAIOpenCodeWizard.ts` | Integriert in `engine/build-opencode.ts` + Electron |

---

## 4. Key Feature: OpenCode Binary Build

Das Herzstück — was PAI-OpenCode einzigartig macht — ist der Custom Build.

### Aktuell (in PAIOpenCodeWizard.ts, muss nach PAI-Install/engine/):

```typescript
// engine/build-opencode.ts
export async function buildOpencodeFromFork(
  options: {
    onProgress: (step: string, percent: number) => void;
    skipIfExists?: boolean;
  }
): Promise<BuildResult> {
  const buildDir = "/tmp/opencode-build";
  const cloneUrl = "https://github.com/Steffen025/opencode.git";
  const branch = "feature/model-tiers";

  // Step 1: Clone
  options.onProgress("Cloning OpenCode fork...", 10);
  await exec(`git clone ${cloneUrl} ${buildDir}`);

  // Step 2: Checkout feature branch
  options.onProgress("Checking out model-tiers branch...", 30);
  await exec(`git checkout ${branch}`, { cwd: buildDir });

  // Step 3: Install deps
  options.onProgress("Installing dependencies...", 50);
  await exec("bun install", { cwd: buildDir });

  // Step 4: Build binary
  options.onProgress("Building standalone binary...", 70);
  await exec(
    "bun run ./packages/opencode/script/build.ts --single",
    { cwd: buildDir }
  );

  // Step 5: Install to PATH
  options.onProgress("Installing to /usr/local/bin...", 90);
  await exec(`cp ${buildDir}/opencode /usr/local/bin/opencode`);
  await exec(`chmod +x /usr/local/bin/opencode`);

  options.onProgress("Done!", 100);
  return { success: true, version: await getOpenCodeVersion() };
}
```

### Electron UI für Build-Schritt:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ⚙  Building OpenCode                                  │
│                                                         │
│   ●  Cloning Steffen025/opencode fork...  ████░░  40%  │
│                                                         │
│   This builds a custom OpenCode binary with:           │
│   • Model Tier routing (quick/standard/advanced)        │
│   • 60x cost optimization                              │
│   • PAI-specific enhancements                          │
│                                                         │
│   Estimated time: ~3-5 minutes                         │
│                                                         │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│   Skip → Use standard OpenCode (no model tiers)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Auto-Detection Flow (Fresh vs. Migrate)

```typescript
// engine/detect.ts (erweitert)
export function detectInstallMode(): "fresh" | "migrate-v2" | "update-v3" {
  const opencodeDir = join(homedir(), ".opencode");

  // No installation
  if (!existsSync(opencodeDir)) return "fresh";

  // Check for v3.x (settings.json with pai.version = 3.x)
  const settings = readSettingsSafe(join(opencodeDir, "settings.json"));
  if (settings?.pai?.version?.startsWith("3")) return "update-v3";

  // Check for v2.x (flat skill structure)
  const skillsDir = join(opencodeDir, "skills");
  if (existsSync(skillsDir)) {
    const hasFlatSkills = detectFlatSkillStructure(skillsDir);
    if (hasFlatSkills) return "migrate-v2";
  }

  // Has .opencode but unknown structure → treat as fresh
  return "fresh";
}
```

### UI Reaction zu Detection:

```
Detected: fresh install
→ Zeige: "Welcome! Let's set up PAI-OpenCode"

Detected: migrate-v2
→ Zeige: "We found PAI-OpenCode v2! Let's upgrade you to v3.0"
        + Backup creation (sichtbar)
        + Migration steps

Detected: update-v3
→ Zeige: "PAI-OpenCode v3.0 found! Running update..."
        + Nur geänderte Files updaten
        + Settings beibehalten
```

---

## 6. Fresh Install Steps (7 Steps)

| Step | UI | Beschreibung |
|------|----|-------------|
| 1 | Welcome | Logo, What's PAI-OpenCode, What happens next |
| 2 | Prerequisites | Check/install: git, bun. Auto-fix wenn fehlend |
| 3 | Build OpenCode | Clone Fork → build binary. Live-Progress-Bar |
| 4 | Provider | 4 Presets: Anthropic / ZEN PAID / ZEN FREE / Ollama |
| 5 | Identity | Name, AI-Name, Timezone |
| 6 | API Keys | Anthropic Key, ElevenLabs (optional) |
| 7 | Done | Summary, "opencode" starten |

---

## 7. Migrate Steps (5 Steps)

| Step | UI | Beschreibung |
|------|----|-------------|
| 1 | Detected | "Found v2.x at ~/.opencode" + What changes |
| 2 | Backup | Backup anlegen (~/.opencode-backup-DATUM), sichtbar |
| 3 | Migrate | Skills flatten, MINIMAL_BOOTSTRAP updaten, validate |
| 4 | Binary Update | Optional: OpenCode Binary updaten (model-tiers) |
| 5 | Done | Summary, keine Settings verloren |

---

## 8. Headless CLI (für Power-User / CI)

Der `cli/quick-install.ts` bleibt, wird aber auf Non-Interactive reduziert:

```bash
# Fresh install (non-interactive, all defaults)
bun PAI-Install/cli/quick-install.ts \
  --preset anthropic \
  --name "Steffen" \
  --ai-name "Jeremy" \
  --no-voice

# Migrate (non-interactive)
bun PAI-Install/cli/quick-install.ts --migrate

# Update
bun PAI-Install/cli/quick-install.ts --update
```

Kein TUI, kein Prompts — nur Argumente. Ideal für Homeserver/CI.

---

## 9. install.sh (vereinfacht)

```bash
#!/usr/bin/env bash
# PAI-OpenCode Installer Bootstrap
set -euo pipefail

# 1. Check bun
if ! command -v bun &>/dev/null; then
  curl -fsSL https://bun.sh/install | bash
fi

# 2. Launch Electron (GUI mode, default)
if [ "${1:-}" = "--cli" ]; then
  bun PAI-Install/cli/quick-install.ts "${@:2}"
else
  cd PAI-Install && bun install --silent && electron .
fi
```

**Vorher:** 165 Zeilen komplexe Bash-Logik  
**Nachher:** ~15 Zeilen Bootstrap

---

## 10. Migrations-Komplexität

### Was entfällt nach Refactor:

| Vorher | Nachher |
|--------|---------|
| `tools/migration-v2-to-v3.ts` | `PAI-Install/engine/migrate.ts` |
| `PAIOpenCodeWizard.ts` | `PAI-Install/engine/build-opencode.ts` |
| 3 separate Install-Paths | 1 Electron + 1 CLI |
| User muss wählen | Auto-detect entscheidet |

---

## 11. Implementation Scope

| Datei | Aktion | Aufwand |
|-------|--------|---------|
| `engine/build-opencode.ts` | NEU (aus Wizard portiert) | 1h |
| `engine/migrate.ts` | NEU (aus tools/ portiert) | 30min |
| `engine/steps-install.ts` | RENAME + anpassen | 30min |
| `engine/steps-migrate.ts` | NEU (aus steps.ts ableiten) | 30min |
| `engine/detect.ts` | EXTEND (mode detection) | 30min |
| `web/public/app.js` | EXTEND (fresh/migrate routing) | 1h |
| `cli/quick-install.ts` | NEU (non-interactive) | 1h |
| `cli/display.ts` | DELETE | — |
| `cli/index.ts` | DELETE | — |
| `cli/prompts.ts` | DELETE | — |
| `install.sh` | SIMPLIFY (165→15 Zeilen) | 15min |
| `tools/migration-v2-to-v3.ts` | DELETE (nach Portierung) | — |
| `PAIOpenCodeWizard.ts` | DEPRECATE + Hinweis | 10min |

**Gesamtaufwand:** ~5-6 Stunden

---

## 12. Entscheidungsbaum für PR #46

```
CodeRabbit Feedback erhalten?
    │
    ├── < 10 substantielle Kommentare
    │   → Refactor direkt in PR #46 einbauen
    │   → Schritte: CodeRabbit fixes + Refactor + Push
    │
    └── >= 10 substantielle Kommentare
        → PR #46 mergen wie ist
        → Neuer PR #47 "refactor(installer): electron-first"
```

---

*Erstellt: 2026-03-09 | Status: Draft — wartet auf CodeRabbit Feedback*  
*Basis: Analyse von PAIOpenCodeWizard.ts, PAI-Install/engine/*, docs/architecture/adr/*
