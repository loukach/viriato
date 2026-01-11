# Viriato Feature Catalog

Complete inventory of features to port from vanilla JS to React.

**Last Updated:** January 2026
**Status:** Migration in progress

---

## 1. Home Page

| Feature | Status | Complexity |
|---------|--------|------------|
| Hero section with gradient | Done | Low |
| 4 ViewerCards with navigation | Done | Low |
| Dynamic stat counters | Pending | Low |

**Components needed:**
- [x] `HomePage.tsx` - Basic structure
- [ ] API integration for live stats

---

## 2. A Assembleia View

| Feature | Status | Complexity |
|---------|--------|------------|
| Large hemicycle SVG (party composition) | Done | High |
| Interactive party legend (click to filter) | Done | Medium |
| Stats cards (parties, gender %, circles) | Removed | - |
| Deputy cards grid (expandable with details) | Done | Medium |
| Search by name | Pending | Low |
| Filter by circle (dropdown) | Pending | Low |
| Filter by gender (dropdown) | Pending | Low |

**Components needed:**
- [ ] `Hemicycle.tsx` - SVG hemicycle with party arcs
- [ ] `PartyLegend.tsx` - Interactive legend
- [ ] `DeputyCard.tsx` - Deputy info card
- [ ] `DeputyFilters.tsx` - Search + dropdowns
- [ ] `useDeputados.ts` - React Query hook

**API endpoints:**
- `GET /api/deputados` - All deputies with summary

---

## 3. Iniciativas View

| Feature | Status | Complexity |
|---------|--------|------------|
| Legislature selector (XIV-XVII + All) | Pending | Low |
| Stats header (total, completed) | Pending | Low |
| Two lifecycle funnels (Laws, Resolutions) | Pending | High |
| Type widget (7 initiative types) | Pending | Medium |
| Month widget (bar chart) | Pending | Medium |
| Author widget (by party/government) | Pending | Medium |
| Full-text search | Pending | Medium |
| Type filter buttons | Pending | Low |
| Initiative cards with status badges | Pending | Medium |
| Expandable card with lifecycle timeline | Pending | High |

**Components needed:**
- [ ] `LegislatureSelector.tsx` - Dropdown
- [ ] `LifecycleFunnel.tsx` - Vertical bar chart
- [ ] `TypeWidget.tsx` - Initiative type cards
- [ ] `MonthWidget.tsx` - Timeline bar chart
- [ ] `AuthorWidget.tsx` - Horizontal bar chart
- [ ] `InitiativeCard.tsx` - Card with expansion
- [ ] `LifecycleTimeline.tsx` - Expandable timeline
- [ ] `StatusBadge.tsx` - 7-category status
- [ ] `TypeBadge.tsx` - Initiative type badge
- [ ] `useInitiatives.ts` - React Query hook
- [ ] `useSearch.ts` - Search hook

**API endpoints:**
- `GET /api/iniciativas?legislature=XVII`
- `GET /api/search?q=query&legislature=XVII`
- `GET /api/legislatures`
- `GET /api/phase-counts`

---

## 4. Agenda View

| Feature | Status | Complexity |
|---------|--------|------------|
| View toggle (Grid / Timeline) | Pending | Low |
| 7 event type filters with colors | Pending | Medium |
| Grid view (calendar cards) | Pending | Medium |
| Timeline view (full calendar) | Pending | High |
| Weekend rows (thin grey lines) | Pending | Low |
| Event cards | Pending | Low |
| Event detail modal | Pending | Medium |
| Linked initiatives in modal | Pending | Medium |

**Event types (7):**
1. Plenario (green)
2. Comissoes (blue)
3. Grupos Parlamentares (purple)
4. Conf. Lideres (cyan)
5. Grupos Trabalho (pink)
6. Visitas (amber)
7. Assistencias (grey)

**Components needed:**
- [ ] `ViewToggle.tsx` - Grid/Timeline switch
- [ ] `EventTypeFilters.tsx` - Color-coded filters
- [ ] `AgendaGrid.tsx` - Card grid view
- [ ] `AgendaTimeline.tsx` - Full calendar timeline
- [ ] `EventCard.tsx` - Event display
- [ ] `EventModal.tsx` - Details + linked initiatives
- [ ] `LinkedInitiative.tsx` - Initiative in modal
- [ ] `useAgenda.ts` - React Query hook

**API endpoints:**
- `GET /api/agenda`
- `GET /api/agenda/<event_id>/initiatives`

---

## 5. Comissoes View

| Feature | Status | Complexity |
|---------|--------|------------|
| Party legend | Pending | Low |
| Committee cards grid | Pending | Medium |
| Mini hemicycle in each card | Pending | Medium |
| Party counts display | Pending | Low |
| Initiative stats badges | Pending | Low |
| Committee detail modal | Pending | High |
| Status chart in modal | Pending | Medium |
| Initiative list in modal | Pending | Medium |
| Upcoming meetings in modal | Pending | Medium |

**Components needed:**
- [ ] `PartyLegend.tsx` - Reuse from Assembleia
- [ ] `CommitteeCard.tsx` - Card with mini hemicycle
- [ ] `MiniHemicycle.tsx` - Small SVG version
- [ ] `CommitteeStats.tsx` - A/E/+/- badges
- [ ] `CommitteeModal.tsx` - Full details
- [ ] `StatusChart.tsx` - Bar chart of statuses
- [ ] `InitiativeList.tsx` - Scrollable list
- [ ] `MeetingsList.tsx` - Upcoming meetings
- [ ] `useCommittees.ts` - React Query hook

**API endpoints:**
- `GET /api/orgaos/summary`
- `GET /api/orgaos/<org_id>`

---

## 6. Shared Components

| Component | Used By | Status |
|-----------|---------|--------|
| `Layout.tsx` | All | Done |
| `Navigation.tsx` | All | Done |
| `LoadingSpinner.tsx` | All | Pending |
| `ErrorState.tsx` | All | Pending |
| `Modal.tsx` | Agenda, Comissoes | Pending |
| `StatCard.tsx` | (unused) | Removed |
| `StatusBadge.tsx` | Iniciativas, Agenda | Pending |

---

## 7. Utilities & Hooks

| Utility | Purpose | Status |
|---------|---------|--------|
| `api.ts` | API client with base URL | Pending |
| `formatDate.ts` | Date formatting (PT-PT) | Pending |
| `partyColors.ts` | Official party colors | Pending |
| `statusCategories.ts` | 60 phases -> 7 categories | Pending |
| `typeLabels.ts` | Initiative type labels | Pending |

---

## Migration Order (Recommended)

1. **Shared utilities** - API client, colors, formatters
2. **Assembleia** - Hemicycle is flagship visualization
3. **Iniciativas** - Core functionality, most data
4. **Agenda** - Timeline complexity
5. **Comissoes** - Reuses hemicycle component

---

## Data Constants

### Party Colors (Political Spectrum Order)
```typescript
const PARTY_COLORS = {
  'CDS-PP': '#0071BC',
  'IL': '#00abe4',
  'PSD': '#FF6500',
  'JPP': '#00ab85',
  'CH': '#0f3468',
  'PS': '#FF66FF',
  'PAN': '#00798f',
  'L': '#C4D600',
  'BE': '#EE4655',
  'PCP': '#FF0000',
};
```

### Status Categories (7)
```typescript
const STATUS_CATEGORIES = {
  submitted: { label: 'Submetida', color: '#9ca3af' },
  announced: { label: 'Anunciada', color: '#38bdf8' },
  discussion: { label: 'Em discussao', color: '#3b82f6' },
  voting: { label: 'Em votacao', color: '#f97316' },
  finalizing: { label: 'A finalizar', color: '#8b5cf6' },
  approved: { label: 'Aprovada', color: '#10b981' },
  rejected: { label: 'Rejeitada', color: '#ef4444' },
};
```

### Event Types (7)
```typescript
const EVENT_TYPES = {
  plenario: { label: 'Plenario', color: '#16a34a' },
  comissoes: { label: 'Comissoes', color: '#2563eb' },
  grupos: { label: 'Grupos Parlamentares', color: '#9333ea' },
  lideres: { label: 'Conf. Lideres', color: '#06b6d4' },
  trabalho: { label: 'Grupos Trabalho', color: '#ec4899' },
  visitas: { label: 'Visitas', color: '#f59e0b' },
  assistencias: { label: 'Assistencias', color: '#6b7280' },
};
```
