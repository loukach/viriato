# Viriato

Visualizing Portuguese Parliament open data. Making democracy more accessible and transparent.

**Live Site:** https://loukach.github.io/viriato/

## What This Is

Two interactive web tools built with Portuguese Parliament's open data:

1. **Parliamentary Agenda** - Daily calendar of all parliament activities
2. **Legislative Initiatives** - Track 808 bills and resolutions through the legislative process

## Current Status

**Phase:** Production (Phase 3)

**Completed:**
- ✅ Data discovery (17 datasets mapped and documented)
- ✅ Legislative process analysis (60 phases documented)
- ✅ PostgreSQL database backend deployed on Render.com
- ✅ REST API with 8 endpoints
- ✅ Single Page Application (SPA) with hash routing
- ✅ Full production deployment on GitHub Pages + Render.com

**Built:**
- Single Page Application with three views (Home, Iniciativas, Agenda)
- PostgreSQL database with 808 iniciativas, 4,888 events, 34 agenda items
- Flask REST API backend
- Automatic data loading from API
- Responsive design for all screen sizes

## Quick Start

**View the live app:**
```
https://loukach.github.io/viriato/               # Home
https://loukach.github.io/viriato/#/iniciativas  # Initiatives
https://loukach.github.io/viriato/#/agenda       # Agenda
```

**API endpoints:**
```
https://viriato-api.onrender.com/api/health      # Health check
https://viriato-api.onrender.com/api/iniciativas # All initiatives
https://viriato-api.onrender.com/api/agenda      # Agenda events
https://viriato-api.onrender.com/api/stats       # Statistics
```

**Local development:**
```bash
# Open the SPA
open docs/index.html

# Or run the API locally
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
python api/app.py
```

No build process needed - Single Page Application with API data loading.

## Architecture

```
┌─────────────────┐
│  GitHub Pages   │  Single Page App (docs/index.html)
│  (Frontend)     │  → Calls API via HTTPS
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│   Render.com    │  Flask REST API (api/app.py)
│   (API Backend) │  → Queries PostgreSQL
└────────┬────────┘
         │
         ↓ SQL
┌─────────────────┐
│   Render.com    │  PostgreSQL Database
│   (Database)    │  808 iniciativas, 4,888 events, 34 agenda items
└─────────────────┘
```

## Project Structure

```
viriato/
├── docs/                     # GitHub Pages site (SPA)
│   ├── index.html           # Single Page Application
│   └── archive/             # Legacy standalone pages
├── api/                      # Flask REST API
│   └── app.py               # 8 endpoints for data access
├── scripts/                  # Database & data utilities
│   ├── download_datasets.py # Fetch from parlamento.pt
│   ├── load_to_postgres.py  # ETL: JSON → PostgreSQL
│   ├── schema.sql           # Database schema
│   └── apply_schema.py      # Schema deployment
├── data/                     # Source data
│   ├── raw/                 # 17 downloaded datasets (JSON)
│   └── schemas/             # Extracted schemas
├── docs/ (markdown)          # Documentation
│   ├── iniciativas-lifecycle.md      # 60 phases explained
│   ├── database-implementation-plan.md  # DB design
│   └── deployment-guide.md           # Render.com deployment
├── requirements.txt          # Python dependencies
└── render.yaml              # Render.com configuration
```

## Key Features

### Parliamentary Agenda
- Complete calendar view (all days, including weekends)
- Color-coded event types (plenary, committees, visits, etc.)
- 213 days tracked (Jun-Dec 2025)

### Legislative Initiatives
- Two lifecycle funnels showing progression:
  - **Laws** (blue): 11 phases from submission to presidential promulgation
  - **Resolutions** (green): 9 phases from submission to parliamentary approval
- 808 initiatives across 7 types
- Full lifecycle timeline for each initiative
- Filter by type (laws, resolutions, deliberations, etc.)

**Design principle:** "It's important to not hide the complexity of running a democracy" - all 60 phases are visible and explained.

## Data Sources

All data from [parlamento.pt open data portal](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx):
- Legislature XVII (2024-present)
- 17 datasets covering initiatives, agenda, deputies, committees, etc.
- Updated: Jun-Dec 2025

## Inspiration

Based on ideas from [adamastor](https://github.com/bcamarneiro/adamastor).

## Technology Stack

**Frontend:**
- Single Page Application (vanilla JavaScript, no frameworks)
- Hash-based routing for bookmarkable views
- Responsive CSS with mobile support
- Hosted on GitHub Pages

**Backend:**
- Flask REST API (Python)
- PostgreSQL database with JSONB for flexible data storage
- Portuguese full-text search (to_tsvector)
- Hosted on Render.com (free tier)

**Data Pipeline:**
- Download scripts fetch from parlamento.pt
- ETL scripts load JSON → PostgreSQL
- UPSERT logic for weekly/daily updates

## Development Approach

1. **Understand first** - Map all available data before building
2. **API-driven** - Separate frontend and backend for flexibility
3. **Embrace complexity** - Show real legislative process, not simplified version
4. **Progressive enhancement** - Start simple, add features based on feedback
5. **Performance** - Lazy load data, cache in memory, minimal API calls
