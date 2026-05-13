import { useMemo } from 'react'
import { retainers } from '@repo/mock-data'
import type { Retainer } from '@repo/mock-data'

/**
 * Hook: Get retainers for a specific client.
 * Phase 1: Filters mock data.
 * Phase 2: Will swap to `useSWR('/api/retainers?clientId=${clientId}', fetcher)`
 */
export function useClientRetainers(clientId: string): Retainer[] {
  return useMemo(
    () => retainers.filter(r => r.clientId === clientId && r.status === 'activ'),
    [clientId]
  )
}

/**
 * Hook: Get all active retainers (for finance dashboard).
 * Phase 1: Returns mock data.
 * Phase 2: Will swap to API call.
 */
export function useActiveRetainers(): Retainer[] {
  return useMemo(
    () => retainers.filter(r => r.status === 'activ'),
    []
  )
}

/**
 * Hook: Get all retainers.
 */
export function useAllRetainers(): Retainer[] {
  return useMemo(() => retainers, [])
}

/**
 * Calculate MRR from active retainers.
 */
export function useMRR(): number {
  const active = useActiveRetainers()
  return useMemo(
    () => active.reduce((sum, r) => sum + r.monthlyAmount, 0),
    [active]
  )
}
