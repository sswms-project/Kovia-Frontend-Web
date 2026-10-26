import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { inboundService } from '../services/inbound.service'
import type { ReceivingLocation } from '../types/receipt-commands.types'

interface Selection {
  key: string
  search: string
  page: number
  selected: ReceivingLocation | null
  touched?: boolean
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
  const searchState = useMemo(() => ({ key, search: state.search }), [key, state.search])
  const debounced = useDebouncedValue(searchState, 350)
  const search = debounced.key === key ? debounced.search.trim() : ''
  const isSearching = state.search.trim() !== search
  const query = useQuery({
    queryKey: [
      'goods-receipts',
      'receiving-locations',
      warehouseId,
      search,
      state.page,
      forDamageIsolation,
    ],
    queryFn: ({ signal }) =>
      inboundService
        .receivingLocations(warehouseId!, search, state.page, signal, forDamageIsolation)
        .then((response) => response.data),
    enabled: enabled && !!warehouseId && !isSearching,
    retry: false,
  })
  const selected =
    state.selected ??
    (!state.touched && !search && state.page === 1 && !isSearching
      ? (query.data?.items.find((item) => item.isSuggested) ?? null)
      : null)
  return {
    ...state,
    selected,
    query,
    isSearching,
    forDamageIsolation,
    searchFor: (search: string) =>
      setStored((previous) => {
        const latest = previous.key === key ? previous : state
        return {
          ...latest,
          selected: latest.selected ?? (latest.touched ? null : selected),
          search,
          page: 1,
        }
      }),
    changePage: (page: number) =>
      setStored((previous) => {
        const latest = previous.key === key ? previous : state
        return { ...latest, selected: latest.selected ?? (latest.touched ? null : selected), page }
      }),
    choose: (id: string) =>
      setStored((previous) => ({
        ...(previous.key === key ? previous : state),
        touched: true,
        selected: query.data?.items.find((item) => item.id === id) ?? null,
      })),
  }
}
