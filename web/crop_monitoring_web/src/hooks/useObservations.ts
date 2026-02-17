import { useQuery } from '@tanstack/react-query'
import { fetchObservations } from '@/services/database.service'
import type { FullObservation, ObservationFilters } from '@/types/database.types'

export function useObservations(filters?: ObservationFilters) {
    return useQuery<FullObservation[], Error>({
        queryKey: ['observations', filters],
        queryFn: () => fetchObservations(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}
