'use client'

import { useMemo, useState } from 'react'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { CycleCountDirectory } from '../components/CycleCountDirectory'
import { useCycleCountsQuery, usePrefetchCycleCount } from '../hooks/use-cycle-count'
import {
  CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER,
  type CycleCountStatus,
} from '../types/cycle-count.types'

export default function CycleCountsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [warehouseId, setWarehouseId] = useState('')
  const [status, setStatus] = useState<
    '' | CycleCountStatus | typeof CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
  >('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  const params = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      ...(warehouseId ? { warehouseId } : {}),
      ...(status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
        ? { needsAdjustment: true }
        : status
          ? { status }
          : {}),
      ...(debouncedSearch.trim() ? { searchTerm: debouncedSearch.trim() } : {}),
    }),
    [page, pageSize, warehouseId, status, debouncedSearch]
  )
  const query = useCycleCountsQuery(params)
  const prefetchCycleCount = usePrefetchCycleCount()
  const me = useMeQuery()
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const options = useMemo(
    () =>
      (warehouses.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehouses.data?.items]
  )
  return (
    <CycleCountDirectory
      items={query.data?.items ?? []}
      totalCount={query.data?.totalCount ?? 0}
      statusCounts={query.data?.statusCounts ?? {}}
      needsAdjustmentCount={query.data?.needsAdjustmentCount ?? 0}
      page={page}
      pageSize={pageSize}
      warehouseId={warehouseId}
      status={status}
      searchTerm={searchTerm}
      warehouses={options}
      canCreate={me.data?.permissions.includes(P.CYCLE_COUNTS_CREATE) ?? false}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      isError={query.isError}
      onWarehouseChange={(value) => {
        setWarehouseId(value)
        setPage(1)
      }}
      onStatusChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      onSearchTermChange={(value) => {
        setSearchTerm(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onRetry={() => void query.refetch()}
      onPrefetchDetail={prefetchCycleCount}
    />
  )
}
