# Bug Log

## 2026-01-11

### Agenda event type labeling
- **Issue**: All agenda events showing as "Comissao" regardless of actual type
- **Cause**: String matching fragile (encoding issues, spelling variations)
- **Fix**: Use ThemeId (numeric) instead of Theme string in `useAgenda.ts`
- **Files**: `frontend/src/hooks/useAgenda.ts`, `frontend/src/lib/eventTypes.ts`

### Missing ThemeId 5 mapping
- **Issue**: Console warning "Unknown ThemeId: 5" for Conferencia de Lideres
- **Cause**: ThemeId 5 not in THEME_ID_MAP
- **Fix**: Added `5: 'Conferencia de Lideres'` to THEME_ID_MAP
- **Files**: `frontend/src/hooks/useAgenda.ts`

### MonthWidget bars invisible
- **Issue**: "Por Mes" widget showing month labels but bars nearly invisible
- **Cause**: Percentage height doesn't work in flex column without explicit height
- **Fix**: Added explicit height container and restructured flex layout
- **Files**: `frontend/src/components/MonthWidget.tsx`
