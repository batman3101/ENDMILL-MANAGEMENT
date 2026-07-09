'use client'

import { useQuery } from '@tanstack/react-query'
import { ProbeVendor } from '@/lib/types/probe'

export function useProbeVendors(factoryId: string | null, role?: 'repair' | 'parts', activeOnly = true) {
  return useQuery({
    queryKey: ['probe-vendors', factoryId, role, activeOnly],
    enabled: !!factoryId,
    queryFn: async (): Promise<ProbeVendor[]> => {
      const sp = new URLSearchParams({ factoryId: factoryId! })
      if (role) sp.set('role', role)
      if (activeOnly) sp.set('activeOnly', 'true')
      const res = await fetch(`/api/probe-vendors?${sp.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? '업체 조회 실패')
      return json.data
    },
  })
}
