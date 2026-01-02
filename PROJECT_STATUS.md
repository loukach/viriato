# Project Status - Viriato

**Last Updated:** January 2, 2026
**Current Phase:** Prototyping (Phase 2)

## Quick Overview

**What:** Portuguese Parliament data visualization tools
**Live:** https://loukach.github.io/viriato/
**Tech:** Static HTML + embedded JSON (no backend, no framework)

## What's Built

### 1. Landing Page
- **File:** `docs/index.html`
- **Status:** ✅ Complete and deployed
- **What:** Purple gradient page with cards linking to both viewers

### 2. Parliamentary Agenda Viewer
- **File:** `docs/agenda.html`
- **Status:** ✅ Complete and deployed
- **What:** Calendar showing all parliamentary activities (Jun-Dec 2025)
- **Data:** 213 days, 8 event types (plenary, committees, visits, etc.)
- **Features:** Shows ALL days including weekends/empty days

### 3. Legislative Initiatives Viewer
- **File:** `docs/iniciativas.html`
- **Status:** ✅ Complete and deployed
- **What:** Track 808 bills/resolutions through legislative process
- **Data:** 808 initiatives, 7 types, 60 phases
- **Features:**
  - Two lifecycle funnels (Laws path vs Resolutions path)
  - Horizontal bar chart ordered by legislative progression
  - Filterable list with expandable lifecycle timelines

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

## Next Steps (Not Started)

**Potential features to consider:**
- Deputy profiles and voting records
- Search functionality
- More detailed initiative information
- Committee meeting details
- Historical comparisons

**No immediate plans** - waiting for feedback on current prototypes.

## Development Notes

**Architecture decisions:**
- Static HTML to keep it simple
- Embedded data to avoid CORS issues
- No build process required
- GitHub Pages for free hosting

**Design principle:**
"It's important to not hide the complexity of running a democracy" - we show all 60 phases, no simplification.

**Git workflow:**
- All prototypes in `/docs` for GitHub Pages
- Working copies in `/prototype` for development
- All data committed to git (user decision)

## File Locations

**Live site:** `/docs` folder
- index.html (landing)
- agenda.html (calendar)
- iniciativas.html (initiatives)
- data.js (embedded data)

**Source data:** `/data` folder
- raw/ (17 JSON datasets)
- schemas/ (18 schema files)
- samples/ (prototype data)

**Documentation:** `/docs` folder (markdown files)
- iniciativas-lifecycle.md
- iniciativas-analysis.md
- discovery-notes.md
- dataset-relationships.md
- schema-analysis.md
- agenda-parlamentar.md
- using-playwright-to-find-dataset-urls.md

**Utilities:** `/scripts` folder
- download_datasets.py
- extract_schemas.py

## Known Issues

None currently. All features working as designed.

## Testing

All pages tested with Playwright:
- ✅ Navigation works (Home ↔ Agenda ↔ Initiatives)
- ✅ Funnels render correctly
- ✅ Data loads properly
- ✅ No console errors

## Performance

- Agenda page: ~100KB (fast)
- Iniciativas page: ~2.7MB (acceptable, loads in <2s)
- No backend calls - everything cached
