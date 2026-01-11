import { useQuery } from '@tanstack/react-query'
import { fetchAgenda, fetchAgendaInitiatives, type AgendaEvent, type LinkedInitiative } from '../lib/api'

// Raw API response type (Parliament data format)
interface RawAgendaEvent {
  Id: number
  Title: string
  Subtitle: string
  EventStartDate: string // DD/MM/YYYY
  EventEndDate: string
  EventStartTime: string
  EventEndTime: string
  Local: string
  Theme: string
  ThemeId: number
  Section: string
  SectionId: number
  OrgDes?: string
}

// Map ThemeId to event type - IDs are stable, strings can have encoding issues
const THEME_ID_MAP: Record<number, string> = {
  7: 'Plenário',
  2: 'Comissões Parlamentares',
  14: 'Grupos Parlamentares',
  15: 'Visitas',
  16: 'Assistências',
  8: 'Plenário', // Agenda do Presidente -> treat as Plenário
  13: 'Comissões Parlamentares', // Resumo da Calendarização -> fallback
}

// Convert DD/MM/YYYY to YYYY-MM-DD (Portuguese date format)
function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month}-${day}`
}

// Transform raw API data to expected format
function transformAgendaEvent(raw: RawAgendaEvent): AgendaEvent {
  // Use ThemeId (stable) to determine event type, fallback to Theme string
  let eventType = THEME_ID_MAP[raw.ThemeId]

  if (!eventType) {
    // Log unknown ThemeId for monitoring - helps catch new event types
    console.warn(`Unknown ThemeId: ${raw.ThemeId} for event "${raw.Title}" - using Theme string: "${raw.Theme}"`)
    eventType = raw.Theme || raw.Section || 'Comissões Parlamentares'
  }

  return {
    event_id: raw.Id,
    event_type: eventType,
    title: raw.Title || '',
    subtitle: raw.Subtitle || '',
    start_date: parseDate(raw.EventStartDate),
    end_date: parseDate(raw.EventEndDate),
    room: raw.Local || '',
    committee_id: null,
  }
}

export function useAgenda() {
  return useQuery<AgendaEvent[]>({
    queryKey: ['agenda'],
    queryFn: async () => {
      const rawData = await fetchAgenda() as unknown as RawAgendaEvent[]
      return rawData.map(transformAgendaEvent)
    },
  })
}

export function useAgendaInitiatives(eventId: number | null) {
  return useQuery<{ initiatives: LinkedInitiative[]; description: string }>({
    queryKey: ['agenda-initiatives', eventId],
    queryFn: () => fetchAgendaInitiatives(eventId!),
    enabled: eventId !== null,
  })
}
