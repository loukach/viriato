# Project Status - Viriato

**Last Updated:** January 3, 2026
**Current Phase:** Production (Phase 3)

## Quick Overview

**What:** Portuguese Parliament data visualization tools
**Live Site:** https://loukach.github.io/viriato/
**API:** https://viriato-api.onrender.com
**Tech:** SPA (vanilla JS) + Flask REST API + PostgreSQL

## What's Built

### Single Page Application
- **File:** `docs/index.html`
- **Status:** ✅ Complete and deployed
- **What:** Hash-routed SPA with 3 views:
  - **Home** (`#/`) - Purple gradient landing with stats cards
  - **Iniciativas** (`#/iniciativas`) - Legislative initiatives tracker
  - **Agenda** (`#/agenda`) - Parliamentary calendar

### Flask REST API
- **File:** `api/app.py`
- **Status:** ✅ Deployed on Render.com
- **Endpoints:**
  - `/api/health` - Health check
  - `/api/iniciativas` - All initiatives with events
  - `/api/iniciativas/<id>` - Single initiative
  - `/api/phase-counts` - Phase statistics
  - `/api/agenda` - Calendar events
  - `/api/stats` - Overall statistics
  - `/api/search` - Full-text search (Portuguese)

### PostgreSQL Database
- **Status:** ✅ Deployed on Render.com
- **Tables:**
  - `iniciativas` - 808 legislative initiatives
  - `iniciativa_events` - 4,888 lifecycle events
  - `agenda_events` - 34 calendar events

## Data Status

**Source:** Portuguese Parliament open data portal
**Legislature:** XVII (2024-present)
**Period:** June-December 2025

### Downloaded Datasets (17 total, 45.6 MB)
- ✅ Initiatives (IniciativasXVII)
- ✅ Parliamentary Agenda (AgendaXVII)
- ✅ Deputies Activity (AtividadeDeputadoXVII)
- ✅ 14 other datasets (committees, votes, questions, etc.)

### Processed Data
- ✅ 18 schemas extracted
- ✅ 100 initiative samples prepared
- ✅ Phase counts calculated
- ✅ Lifecycle analysis documented

## Documentation Status

### For Humans
- ✅ README.md - Project overview and quick start
- ✅ iniciativas-lifecycle.md - Complete explanation of 60 phases
- ✅ iniciativas-analysis.md - Dataset statistics and patterns
- ✅ PROJECT_STATUS.md - This file

### For AI Agents
All documentation uses:
- Clear headings and structure
- Concrete examples
- File paths and line numbers
- No jargon without explanation

## Next Steps

**In Progress:**
- Exposing search functionality in frontend (API already supports it)
- Making funnel data dynamic (using /api/phase-counts)

**Potential features to consider:**
- Deputy profiles and voting records
- More detailed initiative information
- Committee meeting details
- Historical comparisons

## Development Notes

**Architecture decisions:**
- Single Page Application with hash routing (no build process required)
- Flask REST API for data access (CORS enabled)
- PostgreSQL for persistent storage with full-text search
- GitHub Pages for frontend hosting (free)
- Render.com for API and database hosting (free tier)

**Design principle:**
"It's important to not hide the complexity of running a democracy" - we show all 60 phases, no simplification.

**Git workflow:**
- All prototypes in `/docs` for GitHub Pages
- Working copies in `/prototype` for development
- All data committed to git (user decision)

## File Locations

**Frontend (GitHub Pages):** `/docs` folder
- `index.html` - Single Page Application

**Backend API:** `/api` folder
- `app.py` - Flask REST API (8 endpoints)
- `__init__.py` - Package init

**Database Scripts:** `/scripts` folder
- `schema.sql` - Database schema
- `load_to_postgres.py` - ETL: JSON → PostgreSQL
- `download_datasets.py` - Fetch from parlamento.pt
- `apply_schema.py` - Schema deployment

**Source data:** `/data` folder
- `raw/` - 17 JSON datasets (46 MB)
- `schemas/` - Extracted JSON schemas
- `samples/` - Sample data for testing

**Documentation:** Root and `/docs` folders
- `README.md` - Project overview
- `PROJECT_STATUS.md` - This file
- `docs/iniciativas-lifecycle.md` - 60 phases explained
- `docs/deployment-guide.md` - Render.com setup

## Known Issues

None currently. All features working as designed.

## Testing

All pages tested with Playwright:
- ✅ Navigation works (Home ↔ Agenda ↔ Initiatives)
- ✅ Funnels render correctly
- ✅ Data loads properly
- ✅ No console errors

## Performance

- Initial page load: Fast (SPA is lightweight)
- Iniciativas data: ~2.7MB (loaded from API on first visit)
- Agenda data: ~100KB (loaded from API on first visit)
- API cold start: ~10-30s on Render.com free tier (spins down after inactivity)
- Data cached in memory after first load
