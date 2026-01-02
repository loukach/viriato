# Viriato

Visualizing Portuguese Parliament open data. Making democracy more accessible and transparent.

**Live Site:** https://loukach.github.io/viriato/

## What This Is

Two interactive web tools built with Portuguese Parliament's open data:

1. **Parliamentary Agenda** - Daily calendar of all parliament activities
2. **Legislative Initiatives** - Track 808 bills and resolutions through the legislative process

## Current Status

**Phase:** Prototyping (Phase 2)

**Completed:**
- ✅ Data discovery (17 datasets mapped and documented)
- ✅ Legislative process analysis (60 phases documented)
- ✅ Two working prototypes deployed to GitHub Pages

**Built:**
- Landing page with navigation
- Agenda calendar viewer (213 days, Jun-Dec 2025)
- Iniciativas viewer with lifecycle funnels (808 initiatives, 7 types)

## Quick Start

**View the prototypes:**
```
https://loukach.github.io/viriato/               # Landing page
https://loukach.github.io/viriato/agenda.html    # Calendar
https://loukach.github.io/viriato/iniciativas.html  # Initiatives
```

**Local development:**
```bash
# Just open any HTML file in docs/ folder
open docs/index.html
```

No build process needed - static HTML with embedded data.

## Project Structure

```
viriato/
├── docs/                     # GitHub Pages site (static HTML)
│   ├── index.html           # Landing page
│   ├── agenda.html          # Parliamentary agenda viewer
│   ├── iniciativas.html     # Legislative initiatives viewer
│   └── data.js              # Embedded data (2.6MB)
├── data/                     # Source data
│   ├── raw/                 # 17 downloaded datasets (45.6 MB JSON)
│   ├── schemas/             # Extracted schemas (18 files)
│   ├── samples/             # Sample data for prototypes
│   │   ├── IniciativasSample.json  # 100 initiatives
│   │   └── PhaseCounts.json        # Phase statistics
│   └── manifest.json        # Download metadata
├── docs/ (markdown)          # Documentation
│   ├── iniciativas-lifecycle.md    # 60 phases explained
│   ├── iniciativas-analysis.md     # Dataset analysis
│   ├── discovery-notes.md          # Initial findings
│   └── dataset-relationships.md    # How datasets connect
├── scripts/                  # Data utilities
│   ├── download_datasets.py # Get all 17 datasets
│   └── extract_schemas.py   # Generate schemas
└── prototype/               # Development versions
    ├── iniciativas.html     # Working copy
    └── data.js              # Working copy
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

## Development Approach

1. **Understand first** - Map all available data before building
2. **Static first** - No backend, no framework overhead
3. **Embrace complexity** - Show real legislative process, not simplified version
4. **Progressive enhancement** - Start simple, add features based on feedback
