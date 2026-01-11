# Bug Log

Track issues found and fixed during development. Helps prevent regressions.

## 2026-01-11

### Initiative card showing wrong date (DataInicioleg vs entry date)
- **Issue**: All initiative cards showed "03/06/2025" regardless of when the initiative was submitted
- **Cause**: Card displayed `DataInicioleg` (Legislature XVII start date) instead of the initiative's actual entry date
- **Fix**: Changed to display first event date (`IniEventos[0].DataFase`) which is the actual "Entrada" date
- **Files**: `frontend/src/components/InitiativeCard.tsx`
- **Before**: `formatDate(initiative.DataInicioleg)` - same date for ALL XVII initiatives
- **After**: `formatDate(entryDate)` where entryDate is the first event's date

### Initiative card missing features restored
- **Issue**: Expanded card was missing authors section and title stayed truncated
- **Fix**:
  - Title now shows full text when expanded (removes `line-clamp-2`)
  - Authors section added back showing: Governo, party acronyms (GP), or other authors
- **Files**: `frontend/src/components/InitiativeCard.tsx`

### Agenda event type labeling
- **Issue**: All agenda events showing as "Comissão" regardless of actual type
- **Cause**: String matching fragile (encoding issues, spelling variations)
- **Fix**: Use ThemeId (numeric) instead of Theme string in `useAgenda.ts`
- **Files**: `frontend/src/hooks/useAgenda.ts`, `frontend/src/lib/eventTypes.ts`

### Missing ThemeId 5 mapping
- **Issue**: Console warning "Unknown ThemeId: 5" for Conferência de Líderes
- **Cause**: ThemeId 5 not in THEME_ID_MAP
- **Fix**: Added `5: 'Conferência de Líderes'` to THEME_ID_MAP
- **Files**: `frontend/src/hooks/useAgenda.ts`

### MonthWidget bars invisible
- **Issue**: "Por Mês" widget showing month labels but bars nearly invisible
- **Cause**: Percentage height doesn't work in flex column without explicit height
- **Fix**: Added explicit height container (`style={{ height: '128px' }}`) and restructured flex layout
- **Files**: `frontend/src/components/MonthWidget.tsx`

## Design Decisions Log

### Funnel colors (2026-01-11)
- **Decision**: Use single color per funnel (blue for Leis, green for Resoluções)
- **Rationale**: Visual consistency, matches TypeWidget colors
- **Colors**:
  - Leis: #2563eb (blue-600)
  - Resoluções: #16a34a (green-600)

### Author widget "Outros" category (2026-01-11)
- **Decision**: Show ALL parties (no .slice limit) + add "Outros" category
- **Rationale**: Sum of widget should equal total initiatives
- **"Outros" includes**: Regional assemblies, citizens, other non-party/non-government authors

### Filter pills color scheme (2026-01-11)
- **Blue**: Type filters (bg-blue-100 text-blue-800)
- **Green**: Author filters (bg-green-100 text-green-800)
- **Purple**: Month filters (bg-purple-100 text-purple-800)
- **Orange**: Phase filters (bg-orange-100 text-orange-800)

### Interactive filtering behavior (2026-01-11)
- **Within category**: OR logic (PS OR PSD shows both)
- **Across categories**: AND logic (PS AND Leis shows only PS's laws)
- **Visual feedback**: Selected items get ring highlight, non-selected dimmed to 40% opacity
- **Toggle behavior**: Click adds, click again removes

## ThemeId Reference

Parliament API ThemeId mapping (stable IDs for event types):

| ThemeId | Event Type |
|---------|------------|
| 2 | Comissões Parlamentares |
| 5 | Conferência de Líderes |
| 7 | Plenário |
| 8 | Plenário (Agenda do Presidente) |
| 13 | Comissões Parlamentares (Resumo) |
| 14 | Grupos Parlamentares |
| 15 | Visitas |
| 16 | Assistências |

See `frontend/src/hooks/useAgenda.ts` for the complete THEME_ID_MAP.
