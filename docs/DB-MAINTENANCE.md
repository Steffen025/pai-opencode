# Database Maintenance Guide

> Best practices for keeping your PAI-OpenCode database healthy and performant.

---

## Overview

PAI-OpenCode stores conversation history and session data in a SQLite database at:

```text
~/.opencode/conversations.db
```

Over time, this database can grow large. This guide explains how to:

- Monitor database health
- Archive old sessions
- Reclaim disk space
- Restore from archives

---

## When to Archive

| Situation | Action |
|-----------|--------|
| DB size > 500MB | Consider archiving sessions > 90 days |
| Sessions > 90 days old | Archive to reduce size |
| Performance slowdown | VACUUM to defragment |
| Pre-upgrade backup | Create archive before migrations |

---

## Quick Commands

### Check DB Health

```bash
# Via custom command (in OpenCode chat)
/db-archive

# Via standalone tool
bun Tools/db-archive.ts
```

### Archive Old Sessions

```bash
# Archive sessions older than 90 days (default)
bun Tools/db-archive.ts

# Archive sessions older than 180 days
bun Tools/db-archive.ts 180

# Preview only (no changes)
bun Tools/db-archive.ts --dry-run
```

### VACUUM Database

⚠️ **WARNING:** Stop OpenCode before running VACUUM!

```bash
# 1. Exit OpenCode completely
# 2. Archive first (recommended)
bun Tools/db-archive.ts --vacuum
```

VACUUM rebuilds the database file, reclaiming unused space and defragmenting data.

---

## Archive Locations

Archives are stored in:

```
~/.opencode/archives/
├── sessions-2026-01-15.db
├── sessions-2026-02-28.db
└── .last-archive (timestamp file)
```

Each archive is a SQLite database containing:
- `conversations` table (session metadata)
- `messages` (serialized as JSON in archive)

---

## Restoring from Archive

Currently, restore requires manual SQL operations:

```bash
# 1. Open the archive
sqlite3 ~/.opencode/archives/sessions-2026-01-15.db

# 2. List available sessions
SELECT id, title, updated_at FROM conversations;

# 3. Extract specific session data
SELECT * FROM conversations WHERE id = 'session-id-here';

# 4. Import to live DB (in ~/.opencode/conversations.db)
-- Use INSERT OR REPLACE based on extracted data
```

---

## Automated Maintenance

### Automatic Warnings

The session-cleanup handler automatically warns you when:

- Database exceeds 500MB
- Sessions older than 90 days exist

Warnings appear at session start (non-blocking).

### Cron Job (Optional)

Add to your crontab for monthly archiving:

```bash
# Archive sessions > 180 days monthly
0 2 1 * * cd /path/to/pai-opencode && bun Tools/db-archive.ts 180 >> ~/.opencode/logs/archive.log 2>&1
```

---

## Troubleshooting

### "Database is locked"

**Cause:** OpenCode is running and holding the database open.

**Solution:**
1. Exit OpenCode completely
2. Retry the operation

### Archive creation fails

**Cause:** Permissions or disk space.

**Solution:**
```bash
# Check disk space
df -h ~/.opencode

# Check permissions
ls -la ~/.opencode/
```

### Vacuum takes too long

**Cause:** Very large database.

**Solution:**
- Archive sessions first (reduces size)
- Run vacuum during low-activity period
- Ensure 2x current DB size in free disk space

---

## Data Safety

| Feature | Implementation |
|---------|----------------|
| Automatic backup | Created before migration (v2→v3) |
| Archive format | Plain SQLite (queryable) |
| Restore | Manual SQL (for now) |
| Non-destructive | Archiving copies data before removal |

---

## See Also

- `/db-archive` — Custom OpenCode command
- `Tools/db-archive.ts` — Standalone tool
- `UPGRADE.md` — Migration from v2.x
- `CHANGELOG.md` — v3.0 features

---

*Part of PAI-OpenCode v3.0 — Personal AI Infrastructure*
