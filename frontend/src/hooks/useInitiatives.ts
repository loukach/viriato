import { useQuery } from '@tanstack/react-query'
import { fetchInitiatives, fetchLegislatures, searchInitiatives, type Initiative, type Legislature } from '../lib/api'

export function useInitiatives(legislature: string = 'XVII') {
  return useQuery<Initiative[]>({
    queryKey: ['initiatives', legislature],
    queryFn: () => fetchInitiatives(legislature),
  })
}

export function useLegislatures() {
  return useQuery<Legislature[]>({
    queryKey: ['legislatures'],
    queryFn: fetchLegislatures,
  })
}

export function useSearch(query: string, legislature: string = 'XVII') {
  return useQuery<Initiative[]>({
    queryKey: ['search', query, legislature],
    queryFn: () => searchInitiatives(query, legislature),
    enabled: query.length > 0,
  })
}
