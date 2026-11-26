'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import { P } from '@/config/permissionCodes'
import { queryKeys } from '@/lib/query-keys'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useInventoryFilter } from './use-inventory-filter'
import { lowStockAlertService } from '../services/low-stock-alert.service'
import { isLowStockGuid, validateLowStockFilters } from '../utils/low-stock-alert'
import type { LowStockAlertFilters } from '../types/low-stock-alert.types'
function useLowStockUrlFilter(
  key: string,
  initial: string,
  params: Pick<URLSearchParams, 'get' | 'has'>
) {
  const [stored, setStored] = useInventoryFilter<string>(`LowStockAlertsPage.${key}`, initial)
  const value = params.has(key) ? (params.get(key) ?? '') : stored
  useEffect(() => {
    if (value !== stored) setStored(value)
  }, [value, stored, setStored])
  return value
}
export function useLowStockAlerts() {
  const params = useSearchParams()
  const pathname = usePathname()
  const me = useMeQuery()
  const user = useAuthStore((state) => state.user)
  const scope = `${user?.tenantId ?? ''}:${user?.id ?? ''}`
  const permissions = me.data?.permissions ?? []
  const canView = permissions.includes(P.INVENTORY_VIEW)
  const [sharedWarehouse, setSharedWarehouse] = useInventoryFilter<string>('warehouse', '')
  const warehouseId = params.has('warehouseId')
    ? (params.get('warehouseId') ?? '')
    : sharedWarehouse
  useEffect(() => {
    if (warehouseId !== sharedWarehouse) setSharedWarehouse(warehouseId)
  }, [warehouseId, sharedWarehouse, setSharedWarehouse])
  const searchTerm = useLowStockUrlFilter('searchTerm', '', params)
  const productId = useLowStockUrlFilter('productId', '', params)
  const statusFilter = useLowStockUrlFilter('statusFilter', 'Active', params)
  const dateFrom = useLowStockUrlFilter('dateFrom', '', params)
  const dateTo = useLowStockUrlFilter('dateTo', '', params)
  const pageNumber = useLowStockUrlFilter('pageNumber', '1', params)
  const pageSize = useLowStockUrlFilter('pageSize', '20', params)
  const filters: LowStockAlertFilters = {
    warehouseId: warehouseId || undefined,
    productId: productId || undefined,
    searchTerm: searchTerm || undefined,
    statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageNumber: Number(pageNumber),
    pageSize: Number(pageSize),
  }
  const alertId = params.get('alertId') ?? ''
  const validationError = validateLowStockFilters(filters, alertId)
  const debouncedSearch = useDebouncedValue(filters.searchTerm, 300)
  const listFilters = { ...filters, searchTerm: debouncedSearch }
  const enabled = Boolean(user && canView && !validationError)
  const list = useQuery({
    queryKey: queryKeys.inventory.lowStockAlerts(scope, 'list', listFilters),
    queryFn: ({ signal }) => lowStockAlertService.list(listFilters, signal),
    enabled,
    retry: false,
  })
  const detail = useQuery({
    queryKey: queryKeys.inventory.lowStockAlerts(scope, 'detail', alertId),
    queryFn: ({ signal }) => lowStockAlertService.detail(alertId, signal),
    enabled: enabled && isLowStockGuid(alertId),
    retry: false,
  })
  function update(values: Record<string, string | number | undefined>, resetPage = true) {
    const next = new URLSearchParams(params.toString())
    const current = {
      warehouseId,
      searchTerm,
      productId,
      statusFilter,
      dateFrom,
      dateTo,
      pageNumber,
      pageSize,
    }
    for (const [key, value] of Object.entries(current)) {
      if (!next.has(key)) next.set(key, value)
    }
    if (resetPage) next.set('pageNumber', '1')
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined && key === 'alertId') next.delete(key)
      else if (value === undefined) next.set(key, '')
      else next.set(key, String(value))
    }
    window.history.pushState(null, '', `${pathname}?${next}`)
  }
  function reset() {
    update({
      searchTerm: undefined,
      productId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      statusFilter: 'Active',
      alertId: undefined,
    })
  }
  return {
    scope,
    me,
    permissions,
    canView,
    filters,
    alertId,
    validationError,
    list,
    detail,
    update,
    reset,
    enabled,
  }
}
