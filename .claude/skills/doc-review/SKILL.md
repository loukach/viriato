---
name: doc-review
description: Systematic documentation health check for Viriato. Reviews all key docs for staleness, inconsistencies, and missing content. Use when asked to review documentation, check docs, audit documentation, or at the start of sessions.
---

# Documentation Health Check

Run a systematic review of project documentation to identify stale, missing, or inconsistent content.

## Quick Start

1. Query database for current counts
2. Check each documentation file against reality
3. Generate a health report with issues found
4. Offer to fix issues automatically

## Review Categories

| Category | Files | Check For |
|----------|-------|-----------|
| **Status** | PROJECT_STATUS.md, README.md | Dates, counts, feature lists |
| **Technical** | DATA-PIPELINE.md, data-dictionary.md | Schema accuracy, counts |
| **Vision** | product-vision.md | Phase markers match reality |
| **AI Context** | CLAUDE.md | Key info present and accurate |
| **Deployment** | deployment-guide.md | URLs, instructions valid |
| **Pain Points** | citizen-pain-points.md | Status markers accurate |
| **Strategy** | feature-prioritization.md | Roadmap current |

## Execution Steps

### Step 1: Get Current Database State

```sql
SELECT 'iniciativas' as table_name, COUNT(*) FROM iniciativas
UNION ALL SELECT 'deputados', COUNT(*) FROM deputados
UNION ALL SELECT 'deputados_bio', COUNT(*) FROM deputados_bio
UNION ALL SELECT 'orgaos', COUNT(*) FROM orgaos
UNION ALL SELECT 'agenda_events', COUNT(*) FROM agenda_events;
```

### Step 2: Check Frontend Views

Read `docs/index.html` and count navigation tabs to verify view count.

### Step 3: Review Each Doc

For each file in the review categories:
- Check "Last Updated" date (>7 days = stale)
- Compare hardcoded counts to database
- Verify URLs use `viriato-frontend.onrender.com`
- Check feature lists match implementation

### Step 4: Generate Report

```markdown
## Documentation Health Report - [DATE]

### Summary
| Category | Status | Issues |
|----------|--------|--------|
| Status | ✅/⚠️/❌ | count |
| ... | ... | ... |

### Issues Found
1. [File:Line] - Description - Recommendation

### Recommended Actions
- [ ] Action 1
- [ ] Action 2
```

### Step 5: Offer Fixes

Ask user if they want issues fixed automatically.

## Staleness Indicators

- Dates older than 7 days in "Last Updated"
- Hardcoded counts that don't match database
- Old URLs (loukach.github.io)
- TODO/TBD markers
- Missing recent features (e.g., Assembleia view)

## Suggested Frequency

- **Weekly**: Full review
- **After major features**: Affected docs only
- **Before releases**: Complete audit

For detailed checklists, see [content.md](content.md).
