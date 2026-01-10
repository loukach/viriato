# Documentation Health Check Skill

**Invocation:** `/doc-review`

**Purpose:** Systematic review of project documentation to identify stale, missing, or inconsistent content.

---

## Review Categories

### 1. Vision (docs/product-vision.md)
**Check for:**
- Phase status markers (✅ In progress, 🔜 Planned, etc.) match actual implementation
- Success metrics still relevant
- No broken links

### 2. Strategy (GitHub Issues + docs/feature-prioritization.md)
**Check for:**
- Roadmap dates vs current date
- Items marked "complete" that aren't implemented
- Sync between GitHub Issues and prioritization doc

### 3. Technical Docs (docs/DATA-PIPELINE.md, docs/data-dictionary.md)
**Check for:**
- "Last updated" dates
- Database table counts vs actual (`SELECT COUNT(*) FROM table`)
- Field mappings match current schema
- Script references still valid

### 4. Status Tracking (PROJECT_STATUS.md, README.md)
**Check for:**
- "Last Updated" date
- Feature counts (number of views, tables, initiatives)
- URL references (should be viriato-frontend.onrender.com)
- "Known Issues" section accuracy

### 5. AI Context (CLAUDE.md)
**Check for:**
- File exists and has content
- Key architectural decisions documented
- File locations accurate
- Conventions specified

### 6. Deployment (docs/deployment-guide.md)
**Check for:**
- URLs match production
- Environment variables current
- Step-by-step instructions still valid

### 7. Pain Points (docs/citizen-pain-points.md)
**Check for:**
- Priority matrix "Current Status" column accuracy
- Features marked "solved" are actually implemented

---

## Execution Steps

When `/doc-review` is invoked:

1. **Gather current state:**
   ```sql
   -- Run against production database
   SELECT 'iniciativas' as table_name, COUNT(*) FROM iniciativas
   UNION ALL SELECT 'deputados', COUNT(*) FROM deputados
   UNION ALL SELECT 'deputados_bio', COUNT(*) FROM deputados_bio
   UNION ALL SELECT 'orgaos', COUNT(*) FROM orgaos
   UNION ALL SELECT 'agenda_events', COUNT(*) FROM agenda_events;
   ```

2. **Check frontend views:**
   - Read docs/index.html navigation tabs
   - Count actual views implemented

3. **Read each documentation file** and check against checklist above

4. **Generate report** in this format:

```markdown
## Documentation Health Report - [DATE]

### Summary
| Category | Status | Issues Found |
|----------|--------|--------------|
| Vision | ✅ OK | 0 |
| Strategy | ⚠️ Needs Update | 2 |
| ... | ... | ... |

### Issues Found

#### [Category]: [File]
- **Line X**: Says "808 iniciativas" but actual count is 6,748
- **Recommendation**: Update to current count

### Recommended Actions
1. [Specific action with file and line]
2. [Specific action with file and line]
```

5. **Ask user** if they want issues fixed automatically

---

## Files to Review

| Priority | File | Category |
|----------|------|----------|
| P1 | PROJECT_STATUS.md | Status |
| P1 | README.md | Status |
| P1 | CLAUDE.md | AI Context |
| P2 | docs/DATA-PIPELINE.md | Technical |
| P2 | docs/data-dictionary.md | Technical |
| P2 | docs/deployment-guide.md | Deployment |
| P3 | docs/product-vision.md | Vision |
| P3 | docs/citizen-pain-points.md | Pain Points |
| P3 | docs/feature-prioritization.md | Strategy |

---

## Staleness Indicators

Look for these patterns that suggest outdated content:

1. **Dates older than 7 days** in "Last Updated" fields
2. **Hardcoded counts** that don't match database
3. **Old URLs** (loukach.github.io instead of viriato-frontend.onrender.com)
4. **"TODO" or "TBD"** markers left in docs
5. **Phase markers** (✅, 🔜, 📋) that don't match reality
6. **Missing recent features** (e.g., Assembleia view not mentioned)

---

## Suggested Frequency

- **Every session start**: Quick check of PROJECT_STATUS.md date
- **Weekly**: Full `/doc-review` run
- **After major features**: Immediate review of affected docs
- **Before releases**: Complete documentation audit
