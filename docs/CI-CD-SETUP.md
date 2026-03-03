# CI/CD Setup Guide für PAI-OpenCode

> Professionelle Entwicklungs-Workflows: CI/CD, CodeRabbit AI Review, Branch Protection und automatisches Upstream-Monitoring

## Übersicht

Dieses Setup implementiert den gleichen Professionalitäts-Standard wie Warrior AI Solutions (Weston):

| Komponente | Status | Zweck |
|------------|--------|-------|
| **CI Workflow** | ✅ Aktiv | Lint, Typecheck, Secret Scan bei jedem PR |
| **CodeRabbit** | ⚙️ Konfiguriert | AI Code Review auf alle PRs |
| **OpenCode Action** | ✅ Aktiv | `/opencode` Kommandos in Issues/PRs |
| **Upstream Sync** | ✅ Aktiv | Tägliche Überwachung der Forks |
| **Branch Protection** | 🔧 Manuell | In GitHub Settings zu aktivieren |

---

## Schnellstart

### 1. CodeRabbit Installieren (One-Time)

1. Gehe zu https://app.coderabbit.ai
2. Logge dich mit deinem GitHub Account ein
3. Installiere CodeRabbit auf deinem GitHub Account
4. Wähle das `Steffen025/pai-opencode` Repository

**CodeRabbit ist jetzt aktiv** — es reviewt automatisch alle PRs basierend auf `.coderabbit.yaml`.

### 2. GitHub Secrets Konfigurieren

Gehe zu **Settings → Secrets and variables → Actions** und füge hinzu:

| Secret | Wert | Benötigt für |
|--------|------|--------------|
| `UPSTREAM_SYNC_TOKEN` | GitHub Personal Access Token | Upstream Sync Workflows |

**Token erstellen:**
1. https://github.com/settings/tokens → Generate new token (classic)
2. Scopes: `repo` (full control) + `issues` (write)
3. Kopiere den Token und speichere als `UPSTREAM_SYNC_TOKEN`

**Optional (für OpenCode Agent):**
| Secret | Wert | Benötigt für |
|--------|------|--------------|
| `OPENCODE_API_KEY` | Dein OpenCode/Zen API Key | OpenCode Action |

### 3. Branch Protection Aktivieren (Manuell)

Gehe zu **Settings → Branches → Branch protection rules**:

#### Für `dev` Branch:
```
☑️ Require a pull request before merging
☑️ Require status checks to pass
   - Suche nach: "CI — Lint, Typecheck, Secrets"
☑️ Restrict pushes that create files larger than 100 MB
☐ Do not allow bypassing the above settings (für jetzt unchecked lassen)
```

#### Für `main` Branch:
```
☑️ Require a pull request before merging
☑️ Require approvals: 1 (oder 0 wenn du alleine arbeitest)
☑️ Require status checks to pass
   - Suche nach: "CI — Lint, Typecheck, Secrets"
☑️ Dismiss stale PR approvals when new commits are pushed
☑️ Do not allow force pushes
☑️ Do not allow deletions
```

---

## Workflows im Detail

### CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** PRs zu `dev`/`main`, pushes zu `dev`/`main`

**Jobs:**
1. **Bun Setup** — `oven-sh/setup-bun@v2` (⚠️ **NICHT npm!**)
2. **Dependencies** — `bun install`
3. **Typecheck** — `bunx tsc --noEmit` (nur wenn `tsconfig.json` existiert)
4. **Biome Check** — `bunx @biomejs/biome check .` (nur wenn `biome.json` existiert)
5. **Secret Scan** — grep für `sk-*, api_key, client_secret, password, token`
6. **Tests** — `bun test` (nur wenn `.test.ts` Dateien existieren)

**Constraint Check:** Kein `npm install`, `npm ci`, oder `npm run` in diesem Workflow!

### CodeRabbit (`.coderabbit.yaml`)

**Konfiguration:**
- **Profile:** `chill` (nicht zu aggressiv für AI-generierten Code)
- **Sprache:** Deutsch
- **Auto-Review:** Auf PRs targeting `dev` oder `main`
- **Path Instructions:** Spezifische Regeln für:
  - `.opencode/skills/**` — PAI Skills Format
  - `.opencode/agents/**` — Agent Definitionen
  - `Tools/**` — CLI Tools (Bun-only)
  - `skill-packs/**` — Modulare Skill Packs
  - `docs/**` — Dokumentation

### OpenCode Action (`.github/workflows/opencode.yml`)

**Trigger:** Kommentare mit `/opencode` oder `/oc`

**Usage:**
```
# In einem Issue oder PR Kommentar:
/opencode Update the README with new features

# Oder kurz:
/oc Fix the broken link in docs
```

### Upstream Sync Workflows

#### PAI Sync (`.github/workflows/upstream-sync-pai.yml`)

**Schedule:** Täglich 08:00 UTC

**Überwacht:** `danielmiessler/Personal_AI_Infrastructure`

**Aktionen:**
1. Vergleicht deinen Fork mit Upstream
2. Erstellt Issue wenn neue Commits verfügbar:
   - Label: `upstream-sync`, `pai`, `automated`
   - Enthält: Commit-Liste, Links, Checkboxen für Aktionen
3. Erstellt Issue wenn neues Release:
   - Label: `upstream-sync`, `pai`, `release`, `automated`
   - Enthält: Release Notes, Links, Breaking Changes Check

#### OpenCode Sync (`.github/workflows/upstream-sync-opencode.yml`)

**Schedule:** Täglich 08:30 UTC (30min nach PAI)

**Überwacht:** `anomalyco/opencode`

**Aktionen:** Gleiches Pattern wie PAI Sync, aber:
- Label: `upstream-sync`, `opencode`
- Zusätzliche Hinweise zu SDK/Action Änderungen

---

## Entwicklungs-Workflow

### Für dich (Steffen):

```bash
# 1. Feature Branch erstellen (von dev)
git checkout -b feature/neue-funktion origin/dev

# 2. Änderungen machen
# ... edit files ...

# 3. Commit (Conventional Commits)
git commit -m "feat(skills): Add new Cloudflare skill

- Add Cloudflare Workers deployment skill
- Include wrangler.toml templates

Closes #42"

# 4. Push
git push origin feature/neue-funktion

# 5. PR erstellen (target: dev)
# - CI läuft automatisch
# - CodeRabbit reviewed automatisch
# - Wenn CI grün → Merge to dev

# 6. Release (manuell)
# Wenn dev stabil: PR dev→main erstellen
# - Eigene Review + Approval
# - Merge triggers kein Deployment (PAI ist Template, kein Service)
```

### Für OpenCode AI Agent:

```
# In einem PR Kommentar:
/opencode Review this PR for PAI v3.0 compliance

# Oder:
/oc Add error handling to the migration tool
```

---

## Anti-Patterns (WAS NICHT passieren soll)

| ❌ Anti-Pattern | ✅ Korrekt |
|----------------|----------|
| `npm install` in Workflows | `bun install` |
| `eslint` oder `prettier` | `biome check .` |
| Direkte commits zu `main` | PR via `dev` Branch |
| Force push zu geschützten Branches | Nie erlaubt |
| Manuelles Upstream checken | Automatische Issues |

---

## Troubleshooting

### CI schlägt fehl: "No tsconfig.json"
→ Normal wenn noch kein TypeScript konfiguriert. Füge `tsconfig.json` hinzu oder Workflow passt sich an.

### CodeRabbit reviewed nicht
→ Prüfe:
1. CodeRabbit App installiert? (https://app.coderabbit.ai)
2. `.coderabbit.yaml` im Root?
3. PR target ist `dev` oder `main`?

### Upstream Sync erstellt keine Issues
→ Prüfe:
1. `UPSTREAM_SYNC_TOKEN` Secret gesetzt?
2. Token hat `repo` und `issues` scopes?
3. Workflow manuell triggern (Actions Tab → workflow_dispatch)

### Secret Scan false positives
→ Wenn legitime Strings gematcht werden (z.B. `sk-` in Dateinamen):
1. Kommentar mit `# pragma: allowlist secret`
2. Oder: Scan-Regex in CI anpassen

---

## Vergleich: Warrior AI Solutions vs. PAI-OpenCode

| Feature | Warrior AI (Weston) | PAI-OpenCode |
|---------|---------------------|--------------|
| **CI** | ✅ Lint, Typecheck, Test, Secrets | ✅ Gleiches Pattern |
| **CodeRabbit** | ✅ Pro Tier (2 seats) | ✅ Free Tier |
| **OpenCode Action** | ✅ Self-hosted runner | ✅ GitHub-hosted |
| **Branch Protection** | 2 approvers (dev+main) | 1 approver (personal) |
| **Self-hosted Runner** | ✅ Vultr | ❌ Nicht nötig |
| **Upstream Sync** | ❌ Nicht implementiert | ✅ Automatisch |

**Key Difference:** Warrior AI hat Enterprise-Features (self-hosted, 2 approvers), PAI-OpenCode ist optimiert für persönliche/OSS-Nutzung.

---

## Nächste Schritte

1. ✅ CodeRabbit installieren
2. ✅ Secrets konfigurieren
3. ✅ Branch Protection aktivieren
4. ⏳ Warte auf ersten Upstream Sync (morgen 08:00/08:30 UTC)
5. ⏳ Optional: `biome.json` und `tsconfig.json` hinzufügen für volle CI-Nutzung

---

*Dokumentation erstellt: 2026-03-03*
*Basierend auf Warrior AI Solutions Patterns*
