'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { CycleCountDirectory } from '../components/CycleCountDirectory'
import { useCycleCountsQuery, usePrefetchCycleCount } from '../hooks/use-cycle-count'
import {
  CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER,
  CYCLE_COUNT_STATUS_GROUPS,
  type CycleCountListFilter,
} from '../types/cycle-count.types'

export default function CycleCountsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [warehouseId, setWarehouseId] = useState('')
  const [sortBy, setSortBy] = useState('priority')
  const [status, setStatus] = useState<CycleCountListFilter>('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  const params = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      sortBy,
      ...(warehouseId ? { warehouseId } : {}),
      ...(urgentOnly ? { urgent: true } : {}),
      ...(status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
        ? { needsAdjustment: true }
        : status
          ? {
              status: CYCLE_COUNT_STATUS_GROUPS.find(
                (group) => group.value === status
              )?.statuses.join(','),
            }
          : {}),
      ...(debouncedSearch.trim() ? { searchTerm: debouncedSearch.trim() } : {}),
    }),
    [page, pageSize, warehouseId, sortBy, status, urgentOnly, debouncedSearch]
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
  const listExport = useListExport({
    dataset: 'cycle-counts',
    filters: params,
    permissions: me.data?.permissions ?? [],
    viewPermission: P.CYCLE_COUNTS_VIEW,
    totalCount: query.data?.totalCount ?? 0,
    isFetching: query.isFetching,
    isError: query.isError,
    blocked: searchTerm !== debouncedSearch,
  })
  return (
    <CycleCountDirectory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      items={query.data?.items ?? []}
      totalCount={query.data?.totalCount ?? 0}
      statusCounts={query.data?.statusCounts ?? {}}
      needsAdjustmentCount={query.data?.needsAdjustmentCount ?? 0}
      urgentOpenCount={query.data?.urgentOpenCount ?? 0}
      urgentOnly={urgentOnly}
      page={page}
      pageSize={pageSize}
      warehouseId={warehouseId}
      sortBy={sortBy}
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
      onSortChange={(value) => {
        setSortBy(value)
        setPage(1)
      }}
      onStatusChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      onUrgentOnlyChange={(value) => {
        setUrgentOnly(value)
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
