import { useQuery } from '@tanstack/react-query'
import { fetchDeputados, type DeputadosResponse } from '../lib/api'

export function useDeputados() {
  return useQuery<DeputadosResponse>({
    queryKey: ['deputados'],
    queryFn: fetchDeputados,
  })
}
