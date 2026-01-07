# Agenda-Initiative Linking UI Implementation

**Date:** 2026-01-07
**Commits:** `f650f79`, `48b1a97`, `474528b`

## Overview

Users can click agenda events to view linked legislative initiatives in a modal dialog.

## API Endpoint

### `GET /api/agenda/<event_id>/initiatives`

Returns agenda event details with linked initiatives.

**Response Structure:**
```json
{
  "agenda_event": {
    "event_id": 42726,
    "title": "Comissão de Educação e Ciência",
    "date": "2026-01-06",
    "start_time": "15:00:00",
    "end_time": "23:59:00",
    "section": "Comissões Parlamentares",
    "committee": "Comissão de Educação e Ciência",
    "location": ""
  },
  "linked_initiatives": [
    {
      "ini_id": "315588",
      "legislature": "XVII",
      "number": "291",
      "type": "R",
      "type_description": "Projeto de Resolução",
      "title": "...",
      "author": "PS",
      "status": "Baixa comissão especialidade",
      "is_completed": false,
      "text_link": "http://app.parlamento.pt/...",
      "link_type": "bid_direct",
      "link_confidence": 1.0,
      "link_evidence": "BID=315588"
    }
  ]
}
```

**Implementation:** `api/app.py:275-366`
- JOIN query across `agenda_events`, `agenda_initiative_links`, `iniciativas`
- Ordered by confidence DESC, then initiative ID
- Time fields serialized as strings for JSON compatibility

## Frontend Modal

**Files Modified:** `docs/index.html`

### CSS (lines 1565-1809)
- Modal overlay with backdrop
- Initiative cards with type badges
- Loading spinner and error states
- Animations: fadeIn, slideUp

### JavaScript (lines 3273-3374)
- `showAgendaInitiatives(eventId)` - Fetch and render initiatives
- `closeAgendaModal()` - Close modal
- Event listeners for ESC key and overlay clicks

### Click Handlers
- Grid view: `line 2998`
- Timeline view: `line 3258`
- Both call `showAgendaInitiatives(event.Id)`

## User Flow

1. User clicks agenda event
2. Modal opens with loading spinner
3. API request to `/api/agenda/<event_id>/initiatives`
4. Modal displays event details and initiative list
5. User can click "Ver detalhes completos →" to open Parlamento.pt
6. Close via X button, ESC key, or clicking backdrop

## Empty State

Events without linked initiatives show:
```
📋
Sem iniciativas legislativas vinculadas a este evento.
```

## Data Source

Uses `agenda_initiative_links` junction table created in commit `8f2eab0`:
- 50 BID direct links (confidence: 1.00)
- 9 events with links (26.5% of 34 events)
- Event 42726 has 10 linked initiatives

## Deployment

**Production URL:** https://loukach.github.io/viriato/#/agenda
**API URL:** https://viriato-api.onrender.com

Both frontend (GitHub Pages) and backend (Render) deployed automatically via git push.
