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
  Section: string
  OrgDes?: string
}

// Convert DD/MM/YYYY to YYYY-MM-DD (Portuguese date format)
function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month}-${day}`
}

// Transform raw API data to expected format
function transformAgendaEvent(raw: RawAgendaEvent): AgendaEvent {
  return {
    event_id: raw.Id,
    event_type: raw.Theme || raw.Section || 'Comissões Parlamentares',
    title: raw.Title || '',
    subtitle: raw.Subtitle || '',
    start_date: parseDate(raw.EventStartDate),
    end_date: parseDate(raw.EventEndDate),
    room: raw.Local || '',
    committee_id: null, // Could be extracted from OrgDes if needed
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
