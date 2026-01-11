# Project Status - Viriato

**Last Updated:** January 11, 2026
**Current Phase:** Production (React Migration)

## Quick Overview

**What:** Portuguese Parliament data visualization tools
**Live Site:** https://viriato-frontend.onrender.com/
**API:** https://viriato-api.onrender.com
**Tech:** React + Vite + TypeScript + Tailwind (NEW) | Flask REST API + PostgreSQL
**Language:** Portuguese (Portugal) - Interface in PT-PT to serve Portuguese citizens

## What's Built

### React Frontend (NEW - January 2026)
- **Location:** `frontend/` folder
- **Branch:** `feature/react-frontend`
- **Status:** ✅ Complete and deployed
- **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + React Query

**5 Views:**
- **Home** (`/`) - Landing page with stats
- **A Assembleia** (`/assembleia`) - Deputies hemicycle + party breakdown
- **Iniciativas** (`/iniciativas`) - Legislative initiatives with interactive filtering
- **Agenda** (`/agenda`) - Parliamentary calendar timeline
- **Comissões** (`/comissoes`) - Committee composition

### Iniciativas Page Features (Detailed)

#### Interactive Widget Filtering
All analytics widgets are clickable and filter the initiatives list below:

| Widget | What it filters | Visual feedback |
|--------|-----------------|-----------------|
| TypeWidget | Initiative type (J, P, R, S, D, I, A) | Grid cards highlight |
| AuthorWidget | Author (Governo, parties, Outros) | Bars highlight |
| MonthWidget | Entry month (YYYY-MM) | Bars highlight |
| LifecycleFunnel | Current phase | Bars highlight |

**Behavior:**
- Click element → adds filter
- Click again → removes filter (toggle)
- Multiple selections within category → OR logic
- Selections across categories → AND logic
- Non-selected elements → dimmed to 40% opacity
- Selected elements → ring highlight

#### Filter Pills System
- Active filters shown as colored pills below search
- Color-coded by category:
  - Blue: Type filters
  - Green: Author filters
  - Purple: Month filters
  - Orange: Phase filters
- Each pill has × to remove
- "Limpar filtros" link clears all
- Empty state shows: "Clique nos widgets acima para filtrar"

#### Sorting Options
- **Data (mais recentes)** - Newest first by entry date (DEFAULT)
- **Data (mais antigas)** - Oldest first
- **Fase do processo** - By legislative progress (most advanced first)

Phase order for sorting: submitted → announced → discussion → voting → finalizing → approved/rejected

#### Lifecycle Funnels
Two funnels showing phase distribution:
- **Leis (Projetos e Propostas)** - Blue (#2563eb) - Types J and P
- **Resoluções (Projetos e Propostas)** - Green (#16a34a) - Types R and S

Each funnel uses a SINGLE color for all phases (not different colors per phase).

#### Author Widget
Shows ALL parliamentary groups plus:
- **Governo** - Government-authored (shown first)
- **Parties** - All parties sorted by count (no limit)
- **Outros** - Citizens, regional assemblies, other non-party authors

#### Simplified Status Categories
Maps 60+ legislative phases to 7 user-friendly labels:

| Category | Label | Color | CSS Class |
|----------|-------|-------|-----------|
| submitted | Submetida | #9ca3af (gray) | status-submitted |
| announced | Anunciada | #38bdf8 (sky) | status-announced |
| discussion | Em discussão | #3b82f6 (blue) | status-discussion |
| voting | Em votação | #f97316 (orange) | status-voting |
| finalizing | A finalizar | #8b5cf6 (purple) | status-finalizing |
| approved | Aprovada | #10b981 (green) | status-approved |
| rejected | Rejeitada | #ef4444 (red) | status-rejected |

See `frontend/src/lib/statusCategories.ts` for complete phase mapping.

### Flask REST API
- **File:** `api/app.py`
- **Status:** ✅ Deployed on Render.com
- **Endpoints:**
  - `/api/health` - Health check
  - `/api/iniciativas?legislature=XVII` - All initiatives
  - `/api/iniciativas/<id>` - Single initiative
  - `/api/legislatures` - Available legislatures with counts
  - `/api/phase-counts` - Phase statistics
  - `/api/agenda` - Calendar events (raw Parliament format)
  - `/api/agenda/<event_id>/initiatives` - Linked initiatives + description
  - `/api/stats?legislature=XVII` - Overall statistics
  - `/api/search?q=query&legislature=XVII` - Full-text search

### PostgreSQL Database
- **Status:** ✅ Deployed on Render.com
- **Tables:**
  - `iniciativas` - 6,748 legislative initiatives (XIV-XVII)
  - `iniciativa_events` - 57,078 lifecycle events
  - `deputados` - 1,446 deputies (230 currently serving)
  - `deputados_bio` - 330 biographical records
  - `orgaos` - 122 parliamentary bodies
  - `agenda_events` - 69 calendar events

## Data Status

**Source:** Portuguese Parliament open data portal
**Legislatures:** XIV, XV, XVI, XVII (2019-present)

| Legislature | Period | Initiatives |
|-------------|--------|-------------|
| XIV | 2019-2022 | 2,587 |
| XV | 2022-2024 | 1,952 |
| XVI | 2024-2025 | 1,401 |
| XVII | 2025-present | 808 |
| **Total** | | **6,748** |

## File Locations

### Frontend (React)
```
frontend/
├── src/
│   ├── components/
│   │   ├── AuthorWidget.tsx      # Interactive author bar chart
│   │   ├── FilterPills.tsx       # Active filter display
│   │   ├── InitiativeCard.tsx    # Card with timeline expand
│   │   ├── LifecycleFunnel.tsx   # Phase bar chart
│   │   ├── MonthWidget.tsx       # Monthly distribution
│   │   ├── StatusBadge.tsx       # 7-category status label
│   │   ├── TypeBadge.tsx         # Type code pill
│   │   └── TypeWidget.tsx        # Type distribution grid
│   ├── pages/
│   │   ├── IniciativasPage.tsx   # Main initiatives view
│   │   ├── AgendaPage.tsx        # Calendar view
│   │   └── ...
│   ├── hooks/
│   │   ├── useInitiatives.ts     # Fetch + cache initiatives
│   │   └── useAgenda.ts          # Fetch + transform agenda
│   └── lib/
│       ├── statusCategories.ts   # 60 phases → 7 categories
│       ├── typeLabels.ts         # Type codes, names, colors
│       └── partyColors.ts        # Political party colors
└── package.json
```

### Backend API
```
api/
└── app.py                        # Flask REST API
```

### Legacy Frontend (Vanilla JS)
```
docs/
├── index.html                    # Original SPA (deprecated)
└── archive/                      # Old standalone pages
```

## Recent Changes (January 2026)

### React Migration
- ✅ Created React + Vite + TypeScript frontend
- ✅ Ported all 5 views with full feature parity
- ✅ Added Tailwind CSS for styling
- ✅ Deployed to Render.com

### Iniciativas Enhancements
- ✅ Interactive widget filtering (click to filter)
- ✅ Filter pills with remove functionality
- ✅ Sorting by date and phase
- ✅ Author widget shows ALL parties + Outros category
- ✅ Lifecycle funnels use consistent colors per type
- ✅ Renamed funnel title to "Resoluções (Projetos e Propostas)"
- ✅ Changed "Ver ciclo de vida" to "Ver mais" on cards

### Bug Fixes
- ✅ MonthWidget bars now visible (fixed height container)
- ✅ Agenda event types use ThemeId (stable) instead of Theme string
- ✅ Added ThemeId 5 mapping for Conferência de Líderes

## Known Issues

None currently. All features working as designed.

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev      # Dev server with HMR
npm run build    # Production build
```

### API (local)
```bash
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
python api/app.py
```

## Deployment

Both frontend and API deploy automatically to Render.com:
- **Frontend:** Push to `feature/react-frontend` → builds React app
- **API:** Push to `master` → deploys Flask app

## Performance Notes

- Initial page load: Fast (React bundle ~100KB gzipped)
- Iniciativas data: ~2.7MB (cached by React Query)
- API cold start: ~10-30s on Render.com free tier
- Card limit: 50 initiatives displayed (use filters to narrow)
