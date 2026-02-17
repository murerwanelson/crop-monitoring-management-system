import { useQuery } from '@tanstack/react-query'
import { fetchStaff } from '@/services/staff.service'
import type { Profile } from '@/types/database.types'

export function useStaff() {
    return useQuery<Profile[], Error>({
        queryKey: ['staff'],
        queryFn: fetchStaff,
        staleTime: 10 * 60 * 1000, // 10 minutes
    })
}
