# Viriato

Visualização de dados abertos do Parlamento Português. Tornando a democracia mais acessível e transparente.

**Site:** https://viriato-frontend.onrender.com/

## O Que É

Quatro ferramentas interativas construídas com dados abertos do Parlamento Português:

1. **A Assembleia** - Deputados por partido, círculo eleitoral e género
2. **Iniciativas Legislativas** - Acompanhamento de 6,748 propostas através do processo legislativo
3. **Agenda Parlamentar** - Calendário diário de todas as atividades parlamentares
4. **Comissões Parlamentares** - Composição e trabalho das 18 comissões da XVII Legislatura

## Idioma

**O website está em Português (Portugal)** para servir os cidadãos portugueses que são o público-alvo desta aplicação. Toda a interface, documentação e conteúdo são apresentados em português de Portugal, refletindo a língua oficial do parlamento e da população que representa.

## Current Status

**Phase:** Production (React Migration - January 2026)

**Completed:**
- ✅ Data discovery (17 datasets mapped and documented)
- ✅ Legislative process analysis (60 phases documented)
- ✅ PostgreSQL database backend deployed on Render.com
- ✅ REST API with 10+ endpoints
- ✅ **React + TypeScript + Tailwind frontend** (NEW)
- ✅ Full production deployment on Render.com
- ✅ Committee composition and initiative tracking
- ✅ Simplified status categories (60+ phases → 7 labels)
- ✅ **Interactive widget filtering** (click widgets to filter)
- ✅ **Filter pills system** with remove functionality
- ✅ **Sorting** by date and legislative phase

**Built:**
- React SPA with five views (Home, Assembleia, Iniciativas, Agenda, Comissões)
- PostgreSQL database with 6,748 iniciativas (XIV-XVII), 57,078 events, 69 agenda items
- Flask REST API backend with multi-legislature support
- Automatic data loading with React Query caching
- Responsive design for all screen sizes
- Committee-initiative relationships with status tracking

## Quick Start

**View the live app:**
```
https://viriato-frontend.onrender.com/               # Home
https://viriato-frontend.onrender.com/#/iniciativas  # Initiatives
https://viriato-frontend.onrender.com/#/agenda       # Agenda
https://viriato-frontend.onrender.com/#/comissoes    # Committees
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
# Frontend (React)
cd frontend
npm install
npm run dev          # http://localhost:5173

# API (optional, uses production API by default)
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
python api/app.py    # http://localhost:5000
```

## Architecture

```
┌─────────────────┐
│  Render.com     │  React + Vite + TypeScript (frontend/)
│  (Static Site)  │  5 views: Home, Assembleia, Iniciativas, Agenda, Comissões
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
├── frontend/                 # React frontend (NEW)
│   ├── src/
│   │   ├── components/      # UI components (widgets, cards, etc.)
│   │   ├── pages/           # Route-level views
│   │   ├── hooks/           # Data fetching hooks
│   │   └── lib/             # Utilities (statusCategories, etc.)
│   └── package.json
├── docs/                     # Legacy frontend (deprecated)
│   ├── index.html           # Old vanilla JS SPA
│   └── archive/             # Standalone pages
├── api/                      # Flask REST API
│   └── app.py               # 10+ endpoints for data access
├── pipeline/                 # Data pipeline scripts
│   ├── download_datasets.py # Fetch from parlamento.pt
│   ├── load_to_postgres.py  # ETL: JSON → PostgreSQL
│   └── schema.sql           # Database schema
├── data/                     # Source data
│   ├── raw/                 # 17 downloaded datasets (JSON)
│   └── schemas/             # Extracted schemas
├── PROJECT_STATUS.md         # Current status and features
├── BUG_LOG.md               # Bug fixes and design decisions
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
  - **Leis** (blue #2563eb): Projetos + Propostas de Lei
  - **Resoluções** (green #16a34a): Projetos + Propostas de Resolução
- 808 initiatives across 7 types in XVII legislature
- Full lifecycle timeline for each initiative (click "Ver mais")

**Interactive Filtering (NEW):**
- Click any widget element to filter the initiatives list
- Click again to remove filter (toggle behavior)
- Multiple filters: OR within category, AND across categories
- Visual feedback: selected items highlighted, others dimmed

**Filter by:**
- **Type** - Click TypeWidget cards (J, P, R, S, D, I, A)
- **Author** - Click AuthorWidget bars (Governo, parties, Outros)
- **Month** - Click MonthWidget bars (entry month)
- **Phase** - Click LifecycleFunnel bars (current status)

**Sorting Options:**
- Data (mais recentes) - Newest first (DEFAULT)
- Data (mais antigas) - Oldest first
- Fase do processo - By legislative progress

**Simplified status categories** - 60+ phases mapped to 7 labels:
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

**Frontend (NEW - January 2026):**
- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- React Query for data fetching and caching
- React Router for client-side routing
- Hosted on Render.com (Static Site)

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

## Feature Requests

Have ideas for improving Viriato? Check the [GitHub Issues](https://github.com/loukach/viriato/issues) for planned enhancements and to submit your own suggestions.
