import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { inboundService } from '../services/inbound.service'
import type { ReceivingLocation } from '../types/receipt-commands.types'

interface Selection {
  key: string
  search: string
  page: number
  selected: ReceivingLocation | null
}
export function useReceivingLocationSelection(
  warehouseId: string | undefined,
  sessionKey: string,
  enabled: boolean,
  forDamageIsolation = false
) {
  const key = `${warehouseId}:${sessionKey}:${forDamageIsolation}`
  const [stored, setStored] = useState<Selection>({ key, search: '', page: 1, selected: null })
  const state = stored.key === key ? stored : { key, search: '', page: 1, selected: null }
  const query = useQuery({
    queryKey: [
      'goods-receipts',
      'receiving-locations',
      warehouseId,
      state.search,
      state.page,
      forDamageIsolation,
    ],
    queryFn: ({ signal }) =>
      inboundService
        .receivingLocations(warehouseId!, state.search, state.page, signal, forDamageIsolation)
        .then((response) => response.data),
    enabled: enabled && !!warehouseId,
    retry: false,
  })
  return {
    ...state,
    query,
    searchFor: (search: string) => setStored({ ...state, search, page: 1 }),
    changePage: (page: number) => setStored({ ...state, page }),
    choose: (id: string) =>
      setStored({ ...state, selected: query.data?.items.find((item) => item.id === id) ?? null }),
  }
}
