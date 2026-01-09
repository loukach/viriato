# Viriato

Visualização de dados abertos do Parlamento Português. Tornando a democracia mais acessível e transparente.

**Site:** https://loukach.github.io/viriato/

## O Que É

Quatro ferramentas interativas construídas com dados abertos do Parlamento Português:

1. **Agenda Parlamentar** - Calendário diário de todas as atividades parlamentares
2. **Iniciativas Legislativas** - Acompanhamento de 6,748 propostas através do processo legislativo
3. **Comissões Parlamentares** - Composição e trabalho das 18 comissões da XVII Legislatura

## Idioma

**O website está em Português (Portugal)** para servir os cidadãos portugueses que são o público-alvo desta aplicação. Toda a interface, documentação e conteúdo são apresentados em português de Portugal, refletindo a língua oficial do parlamento e da população que representa.

## Current Status

**Phase:** Production (Phase 3)

**Completed:**
- ✅ Data discovery (17 datasets mapped and documented)
- ✅ Legislative process analysis (60 phases documented)
- ✅ PostgreSQL database backend deployed on Render.com
- ✅ REST API with 10+ endpoints
- ✅ Single Page Application (SPA) with hash routing
- ✅ Full production deployment on GitHub Pages + Render.com
- ✅ Committee composition and initiative tracking
- ✅ Simplified status categories (60+ phases → 7 labels)

**Built:**
- Single Page Application with four views (Home, Iniciativas, Agenda, Comissões)
- PostgreSQL database with 6,748 iniciativas (XIV-XVII), 57,078 events, 34 agenda items
- Flask REST API backend with multi-legislature support
- Automatic data loading from API
- Responsive design for all screen sizes
- Committee-initiative relationships with status tracking

## Quick Start

**View the live app:**
```
https://loukach.github.io/viriato/               # Home
https://loukach.github.io/viriato/#/iniciativas  # Initiatives
https://loukach.github.io/viriato/#/agenda       # Agenda
https://loukach.github.io/viriato/#/comissoes    # Committees
```

**API endpoints:**
```
https://viriato-api.onrender.com/api/health        # Health check
https://viriato-api.onrender.com/api/iniciativas   # All initiatives
https://viriato-api.onrender.com/api/agenda        # Agenda events
https://viriato-api.onrender.com/api/stats         # Statistics
https://viriato-api.onrender.com/api/orgaos/summary # Committees with stats
https://viriato-api.onrender.com/api/orgaos/{id}   # Committee details
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
│  (Frontend)     │  4 views: Home, Iniciativas, Agenda, Comissões
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│   Render.com    │  Flask REST API (api/app.py)
│   (API Backend) │  10+ endpoints for data access
└────────┬────────┘
         │
         ↓ SQL
┌─────────────────┐
│   Render.com    │  PostgreSQL Database
│   (Database)    │  6,748 iniciativas, 57,078 events, 40 orgaos
└─────────────────┘
```

## Project Structure

```
viriato/
├── docs/                     # GitHub Pages site (SPA)
│   ├── index.html           # Single Page Application
│   └── archive/             # Legacy standalone pages
├── api/                      # Flask REST API
│   └── app.py               # 10+ endpoints for data access
├── scripts/                  # Database & data utilities
│   ├── download_datasets.py # Fetch from parlamento.pt
│   ├── load_to_postgres.py  # ETL: JSON → PostgreSQL (initiatives)
│   ├── load_orgaos.py       # ETL: Committee composition data
│   ├── load_comissao_links.py # Committee-initiative relationships
│   ├── load_authors.py      # Initiative authorship (deputies, parties)
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
- Two view modes: **Grelha** (grid) and **Cronograma** (timeline)
- 7 distinct event types with interactive filters:
  - **Plenário** (green) - Plenary sessions where laws are voted
  - **Comissões** (blue) - Committee meetings
  - **Grupos Parlamentares** (purple) - Party group meetings
  - **Conf. Líderes** (cyan) - Leaders conference
  - **Grupos Trabalho** (pink) - Working groups
  - **Visitas** (amber) - Palace visits (schools, tours)
  - **Assistências** (grey) - Plenary assistances
- Click legend items to show/hide event types
- Event detail modal with description (visit details, school names, times)
- Complete calendar view (all days from first to last event, including weekends)

### Legislative Initiatives
- Two lifecycle funnels showing progression:
  - **Laws** (blue): 11 phases from submission to presidential promulgation
  - **Resolutions** (green): 9 phases from submission to parliamentary approval
- 808 initiatives across 7 types
- Full lifecycle timeline for each initiative
- Filter by type (laws, resolutions, deliberations, etc.)
- **Simplified status categories** - 60+ legislative phases mapped to 7 user-friendly labels:
  - Submetida, Anunciada, Em discussão, Em votação, A finalizar, Aprovada, Rejeitada

**Design principle:** "It's important to not hide the complexity of running a democracy" - all 60 phases are visible and explained.

### Parliamentary Committees (Comissões)
- **18 committees** of the XVII Legislature with party composition
- **Hemicycle visualization** showing party representation in each committee
- **Initiative statistics** on each card:
  - A (Authored) - initiatives authored by the committee
  - E (Em análise) - initiatives in progress
  - + (Approved) - completed and approved
  - - (Rejected) - rejected, withdrawn, or lapsed
- **Committee detail modal** with:
  - Status bar chart showing initiative distribution by lifecycle phase
  - List of initiatives under review (lead and secondary)
  - Vote results and rapporteur assignments
  - Upcoming committee meetings from agenda

## Data Sources

All data from [parlamento.pt open data portal](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx):
- Legislatures XIV-XVII (2019-present)
- 17 datasets covering initiatives, agenda, deputies, committees, etc.
- Updated: Oct 2019 - Dec 2025

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
