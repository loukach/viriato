# Viriato React Frontend

React-based frontend for the Viriato Portuguese Parliament data visualization platform.

**Live Site:** https://viriato-frontend.onrender.com/

## Tech Stack

- **React 18** + **TypeScript** - Type-safe component development
- **Vite** - Fast build tooling and HMR
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management and caching
- **React Router** - Client-side routing

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AuthorWidget.tsx     # Party/author bar chart (interactive)
│   │   ├── FilterPills.tsx      # Active filter display with remove
│   │   ├── InitiativeCard.tsx   # Initiative card with timeline
│   │   ├── LifecycleFunnel.tsx  # Phase progression bar chart
│   │   ├── MonthWidget.tsx      # Monthly distribution chart
│   │   ├── StatusBadge.tsx      # Simplified status labels
│   │   ├── TypeBadge.tsx        # Initiative type pills
│   │   └── TypeWidget.tsx       # Type distribution grid
│   │
│   ├── pages/               # Route-level components
│   │   ├── HomePage.tsx
│   │   ├── AssembleiaPage.tsx
│   │   ├── IniciativasPage.tsx
│   │   ├── AgendaPage.tsx
│   │   └── ComissoesPage.tsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useInitiatives.ts    # Fetch + cache initiatives
│   │   └── useAgenda.ts         # Fetch + transform agenda
│   │
│   ├── lib/                 # Utilities and constants
│   │   ├── api.ts               # API client functions
│   │   ├── statusCategories.ts  # 60 phases → 7 categories
│   │   ├── typeLabels.ts        # Type codes and colors
│   │   ├── partyColors.ts       # Political party colors
│   │   └── formatDate.ts        # Date formatting helpers
│   │
│   ├── App.tsx              # Router and layout
│   └── main.tsx             # Entry point
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Key Features

### Interactive Widget Filtering (Iniciativas Page)

All analytics widgets are clickable and filter the initiatives list:

1. **Click any widget element** to add a filter
2. **Click again** to remove the filter
3. **Multiple filters** combine: OR within category, AND across categories
4. **Visual feedback**: Selected items highlighted, others dimmed to 40% opacity
5. **Filter pills** show active filters with × to remove

**Filterable widgets:**
- **TypeWidget** - Filter by initiative type (J, P, R, S, D, I, A)
- **AuthorWidget** - Filter by author (Governo, parties, Outros)
- **MonthWidget** - Filter by entry month
- **LifecycleFunnel** - Filter by current phase

### Sorting Options

Three sort modes available:
- **Data (mais recentes)** - Newest first by entry date (default)
- **Data (mais antigas)** - Oldest first
- **Fase do processo** - By legislative progress (most advanced first)

### Simplified Status Categories

Maps 60+ legislative phases to 7 user-friendly labels:

| Category | Label | Color | Example Phases |
|----------|-------|-------|----------------|
| submitted | Submetida | Gray | Entrada, Publicação |
| announced | Anunciada | Light Blue | Anúncio, Baixa comissão |
| discussion | Em discussão | Blue | Discussão, Parecer |
| voting | Em votação | Orange | Votação generalidade |
| finalizing | A finalizar | Purple | Promulgação, Referenda |
| approved | Aprovada | Green | Lei publicada |
| rejected | Rejeitada | Red | Rejeitado, Caducado |

See `src/lib/statusCategories.ts` for the complete mapping.

### Lifecycle Funnels

Two funnels show phase distribution:
- **Leis (Projetos e Propostas)** - Blue color (#2563eb)
- **Resoluções (Projetos e Propostas)** - Green color (#16a34a)

Each uses a single color for all phases for visual consistency.

### Author Widget

Shows initiative distribution by author:
- **Governo** - Government-authored (shown first)
- **Parties** - All parliamentary groups, sorted by count
- **Outros** - Citizens, regional assemblies, etc.

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment

The frontend expects the API at:
- **Production:** `https://viriato-api.onrender.com`
- **Development:** Same (no local API needed)

## Deployment

Deployed automatically to Render.com on push to `feature/react-frontend` branch.

Build settings:
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

## Component Reference

### InitiativeCard

Expandable card showing initiative details with lifecycle timeline.

**Features (DO NOT REMOVE):**
- **Date displayed**: Entry date from first event (`IniEventos[0].DataFase`), NOT `DataInicioleg`
- **Title**: Truncated to 2 lines when collapsed, full title when expanded
- **Authors section**: Shows in expanded view (Governo, party acronyms, or other authors)
- **Lifecycle timeline**: Shows all events with phase name and date
- **Link to Parliament**: Direct link to parlamento.pt initiative page

**Data fields used:**
| Field | Purpose |
|-------|---------|
| `IniEventos[0].DataFase` | Entry date (displayed with 📅) |
| `IniEventos` | Lifecycle events for timeline |
| `IniAutorGruposParlamentares` | Party authors (GP field) |
| `IniAutorOutros.nome` | Government or other authors |
| `_currentStatus` | Simplified status badge |

### FilterPills

Displays active filters as colored pills.

```tsx
<FilterPills
  filters={{ types: ['J'], authors: ['PS'], months: [], phases: [] }}
  onRemove={(category, value) => { /* remove filter */ }}
  onClearAll={() => { /* clear all */ }}
/>
```

### TypeWidget (Interactive)

```tsx
<TypeWidget
  initiatives={initiatives}
  selectedTypes={['J', 'P']}       // Highlighted types
  onToggleType={(type) => { }}    // Click handler
/>
```

### AuthorWidget (Interactive)

```tsx
<AuthorWidget
  initiatives={initiatives}
  selectedAuthors={['PS']}
  onToggleAuthor={(author) => { }}
/>
```

### MonthWidget (Interactive)

```tsx
<MonthWidget
  initiatives={initiatives}
  selectedMonths={['2025-01']}
  onToggleMonth={(month) => { }}
/>
```

### LifecycleFunnel (Interactive)

```tsx
<LifecycleFunnel
  initiatives={lawsInitiatives}
  title="Leis (Projetos e Propostas)"
  color="#2563eb"
  selectedPhases={['voting', 'discussion']}
  onTogglePhase={(phase) => { }}
/>
```

## Known Behaviors

1. **API Cold Start**: Render.com free tier spins down after inactivity. First request may take 10-30s.

2. **Initiative Limit**: Cards display is limited to 50 initiatives. Use filters/search to narrow results.

3. **Widget Counts**: Widget counts show totals from ALL initiatives, not just filtered ones. This is intentional to maintain context.
