import { useQuery } from '@tanstack/react-query'
import { fetchAgenda, fetchAgendaInitiatives, type AgendaEvent, type LinkedInitiative } from '../lib/api'

export function useAgenda() {
  return useQuery<AgendaEvent[]>({
    queryKey: ['agenda'],
    queryFn: fetchAgenda,
  })
}

export function useAgendaInitiatives(eventId: number | null) {
  return useQuery<{ initiatives: LinkedInitiative[]; description: string }>({
    queryKey: ['agenda-initiatives', eventId],
    queryFn: () => fetchAgendaInitiatives(eventId!),
    enabled: eventId !== null,
  })
}
