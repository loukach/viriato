# Viriato - AI Assistant Context

## Project Overview

**Viriato** is a Portuguese Parliament data visualization platform making democracy accessible to citizens.

- **Live Site:** https://viriato-frontend.onrender.com/
- **API:** https://viriato-api.onrender.com/
- **GitHub:** https://github.com/loukach/viriato

## Architecture

```
Frontend (Render Static Site)     API (Render Web Service)     Database (Render PostgreSQL)
docs/index.html + app.js    →     api/app.py (Flask)      →    viriato database
```

## Key Files

| File | Purpose |
|------|---------|
| `docs/index.html` | Single Page Application (main entry) |
| `docs/app.js` | Frontend JavaScript (views, components) |
| `docs/styles.css` | All CSS styles |
| `api/app.py` | Flask REST API (all endpoints) |
| `scripts/schema.sql` | Database schema definition |
| `scripts/load_*.py` | Data loading scripts |

## Database Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `iniciativas` | Legislative initiatives | ini_id, title, type, current_status |
| `iniciativa_events` | Initiative lifecycle events | phase_code, phase_name, event_date |
| `deputados` | Deputies (core identity) | dep_id, name, party, situation |
| `deputados_bio` | Deputy biographical data | cad_id, gender, birth_date, profession |
| `orgaos` | Parliamentary committees | org_id, name, org_type |
| `orgao_membros` | Committee membership | dep_id, role, party |
| `agenda_events` | Parliamentary calendar | event_id, title, start_date |

## Frontend Views

The SPA has 5 views accessible via hash routing:

1. **Home** (`#/`) - Landing page with stats
2. **A Assembleia** (`#/assembleia`) - Deputies by party, gender, district
3. **Iniciativas** (`#/iniciativas`) - Legislative initiatives tracker
4. **Agenda** (`#/agenda`) - Parliamentary calendar
5. **Comissoes** (`#/comissoes`) - Committee composition

## Conventions

### Language
- **UI/UX:** Portuguese (PT-PT) - serving Portuguese citizens
- **Code comments:** English acceptable
- **Documentation:** Mix (technical in English, user-facing in Portuguese)

### Code Style
- Frontend: Vanilla JavaScript (no frameworks)
- Backend: Flask with psycopg2
- Database: PostgreSQL with JSONB for raw data preservation

### Git Workflow
- Main branch: `master`
- Auto-deploy: Render deploys on push to master
- Commit messages: English, descriptive

## Available Skills

### `/doc-review`
Systematic documentation health check. Reviews all key docs for staleness, inconsistencies, and missing content. Run weekly or after major features.

See: `.claude/skills/doc-review/SKILL.md`

## Data Pipeline

```bash
# Download fresh data from Parliament
python scripts/download_datasets.py

# Load to database (order matters)
python scripts/load_to_postgres.py      # Initiatives + Agenda
python scripts/load_deputados.py        # Deputies
python scripts/load_orgaos.py           # Committees
python scripts/load_committee_links.py  # Committee-Initiative links
```

## Testing

```bash
# Unit tests
python -m pytest tests/ -v

# End-to-end: Use Playwright MCP to test live site
# Navigate to https://viriato-frontend.onrender.com/
```

## Common Tasks

### Check API health
```bash
curl https://viriato-api.onrender.com/api/health
```

### Query production database
Use `mcp__render__query_render_postgres` with the Render Postgres ID.

### View deploy logs
Use `mcp__render__list_logs` with service ID `srv-d5c5fla4d50c73fo5reg`.

## Documentation

| Doc | Purpose |
|-----|---------|
| `README.md` | Project overview |
| `PROJECT_STATUS.md` | Current status and features |
| `docs/product-vision.md` | Long-term vision |
| `docs/DATA-PIPELINE.md` | Data flow reference |
| `docs/citizen-pain-points.md` | Problems we're solving |

## Important Notes

1. **Deputy data uses 2-table architecture**: `deputados` (core) + `deputados_bio` (biographical). Always JOIN when needing gender, birth_date, etc.

2. **Serving deputies filter**: Use `situation IN ('Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo')` for the 230 currently serving.

3. **Initiative counts**: XVII legislature has ~808, total across XIV-XVII is ~6,748.

4. **API cold starts**: Render free tier spins down after inactivity. First request may take 10-30 seconds.
