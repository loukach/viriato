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
  - **Iniciativas** (`#/iniciativas`) - Legislative initiatives tracker with multi-legislature support
  - **Agenda** (`#/agenda`) - Parliamentary calendar
- **Features:**
  - Legislature selector (All, XVII, XVI, XV, XIV)
  - Full-text search with Portuguese language support
  - Type filters (Laws, Resolutions, Government Bills, etc.)
  - Lifecycle funnels showing phase progression
  - Analytics widgets (by type, month, party, origin)

### Flask REST API
- **File:** `api/app.py`
- **Status:** ✅ Deployed on Render.com
- **Endpoints:**
  - `/api/health` - Health check
  - `/api/iniciativas?legislature=XVII` - All initiatives (optional legislature filter)
  - `/api/iniciativas/<id>` - Single initiative
  - `/api/legislatures` - List available legislatures with counts (NEW)
  - `/api/phase-counts` - Phase statistics
  - `/api/agenda` - Calendar events
  - `/api/stats?legislature=XVII` - Overall statistics (optional legislature filter)
  - `/api/search?q=query&legislature=XVII` - Full-text search (optional legislature filter)

### PostgreSQL Database
- **Status:** ✅ Deployed on Render.com
- **Tables:**
  - `iniciativas` - 6,748 legislative initiatives (all 4 legislatures)
  - `iniciativa_events` - 57,078 lifecycle events
  - `agenda_events` - 34 calendar events

## Data Status

**Source:** Portuguese Parliament open data portal
**Legislatures:** XIV, XV, XVI, XVII (2019-present)
**Period:** October 2019 - December 2025

### Downloaded Datasets
**Initiatives by Legislature:**
- ✅ Legislature XIV (2019-2022): 2,587 initiatives
- ✅ Legislature XV (2022-2024): 1,952 initiatives
- ✅ Legislature XVI (2024): 1,401 initiatives
- ✅ Legislature XVII (2024-present): 808 initiatives
- **Total: 6,748 initiatives** spanning 6+ years

**Other Datasets (17 total, ~210 MB):**
- ✅ Parliamentary Agenda (AgendaXVII)
- ✅ Deputies Activity (AtividadeDeputadoXVI, XVII)
- ✅ 14 other datasets (committees, votes, questions, etc.)

### Processed Data
- ✅ 18 schemas extracted
- ✅ 100 initiative samples prepared
- ✅ Phase counts calculated
- ✅ Lifecycle analysis documented
- ✅ All 4 legislatures loaded to PostgreSQL

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

**Recently Completed:**
- ✅ Search functionality in frontend (uses /api/search endpoint)
- ✅ Dynamic funnel data computation from loaded initiatives
- ✅ Multi-legislature support (XIV, XV, XVI, XVII)
- ✅ Legislature selector in frontend
- ✅ All 4 legislatures loaded to database (6,748 initiatives total)

**Deployment Status:**
- ✅ API changes pushed to GitHub (will auto-deploy on Render.com)
- ⏳ Frontend changes pushed to GitHub (GitHub Pages deployment in progress, 1-10 minutes)

**Potential features to consider:**
- Deputy profiles and voting records
- More detailed initiative information
- Committee meeting details
- Cross-legislature comparisons and analytics
- Historical trends visualization

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

**Start of Session Testing Checklist:**
Use Playwright MCP to test the live site (https://loukach.github.io/viriato/):

1. **Navigation** - Click through Home → Iniciativas → Agenda tabs
2. **Search functionality** - On Iniciativas page:
   - Type "saúde" in search box and click Search
   - Verify results appear with matching initiatives
   - Click Clear to reset
3. **Type filters** - Click each filter button (All, Laws, Resolutions, Government Bills, Deliberations)
4. **Funnels** - Verify both Laws and Resolutions funnels render with bars
5. **Initiative cards** - Click a card to expand and see lifecycle timeline
6. **Agenda view** - Verify calendar events load and display

**Previous Test Results:**
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
