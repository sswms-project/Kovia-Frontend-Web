'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'

/** Both return directories keep their filters in the URL, including when opened from a detail. */
export function useReturnListState<T extends string>(path: string, statuses: readonly T[]) {
  const params = useSearchParams()
  const router = useRouter()
  const parsedPage = Number(params.get('page') ?? 1)
  const parsedSize = Number(params.get('pageSize') ?? 10)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1
  const pageSize = [10, 20, 30, 50].includes(parsedSize) ? parsedSize : 10
  const status: T | '' = statuses.find((value) => value === params.get('status')) ?? ''
  const query = new URLSearchParams(params.toString())
  query.delete('id')
  query.delete('create')
  const suffix = query.size ? `?${query}` : ''

  function change(key: string, value: string | number) {
    const next = new URLSearchParams(params.toString())
    next.delete('id')
    next.delete('create')
    if (value === '') next.delete(key)
    else next.set(key, String(value))
    if (key !== 'page') next.delete('page')
    // The path is a fixed application route; only its search parameters are composed at runtime.
    router.replace((next.size ? `${path}?${next}` : path) as Route, { scroll: false })
  }

  return {
    page,
    pageSize,
    status,
    searchText: params.get('search') ?? '',
    warehouseId: params.get('warehouse') ?? '',
    supplierId: params.get('supplier') ?? '',
    dateFrom: params.get('from') ?? '',
    dateTo: params.get('to') ?? '',
    listHref: `${path}${suffix}`,
    detailHref: (id: string) => `${path}/${encodeURIComponent(id)}${suffix}`,
    setPage: (value: number) => change('page', value),
    setPageSize: (value: number) => change('pageSize', value),
    setStatus: (value: T | '') => change('status', value),
    setSearchText: (value: string) => change('search', value),
    setWarehouseId: (value: string) => change('warehouse', value),
    setSupplierId: (value: string) => change('supplier', value),
    setDateFrom: (value: string) => change('from', value),
    setDateTo: (value: string) => change('to', value),
  }
}
