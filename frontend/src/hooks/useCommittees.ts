import { useQuery } from '@tanstack/react-query'
import { fetchCommittees, fetchCommitteeDetails, type Committee } from '../lib/api'

export function useCommittees() {
  return useQuery<Committee[]>({
    queryKey: ['committees'],
    queryFn: fetchCommittees,
  })
}

export function useCommitteeDetails(orgId: number | null) {
  return useQuery({
    queryKey: ['committee-details', orgId],
    queryFn: () => fetchCommitteeDetails(orgId!),
    enabled: orgId !== null,
  })
}
