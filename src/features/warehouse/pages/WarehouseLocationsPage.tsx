'use client'

import { useMeQuery } from '@/features/auth/hooks/use-auth'

import { P } from '@/config/permissionCodes'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useAuthStore } from '@/stores/auth.store'
import { WarehouseLocationDirectory } from '../components/WarehouseLocationsPage'
import { useWarehouseLayoutQuery, useWarehouseLocationsQuery } from '../hooks/use-warehouse'
import type { LocationFilterState, WarehouseLocationQuery } from '../types/warehouse.types'
import { getWarehouseCapabilities } from '../utils/warehouse-capabilities'

interface WarehouseLocationsPageProps {
  readonly warehouseId: string
}

const EMPTY_FILTERS: LocationFilterState = {
  type: '',
  lifecycleStatus: '',
  occupancyStatus: '',
  zoneId: '',
  rackId: '',
}

export function WarehouseLocationsPage({ warehouseId }: WarehouseLocationsPageProps) {
  const meQuery = useMeQuery()
  const role = useAuthStore((state) => state.user?.role ?? null)
  const capabilities = getWarehouseCapabilities(role)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<LocationFilterState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<LocationFilterState>(EMPTY_FILTERS)
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 350)
  const query = useMemo<WarehouseLocationQuery>(
    () => ({
      top: pageSize,
      skip: (page - 1) * pageSize,
      needTotalCount: true,
      ...(debouncedSearchText ? { searchText: debouncedSearchText } : {}),
      ...(appliedFilters.type ? { type: appliedFilters.type } : {}),
      ...(appliedFilters.lifecycleStatus
        ? { lifecycleStatus: appliedFilters.lifecycleStatus }
        : {}),
      ...(appliedFilters.occupancyStatus
        ? { occupancyStatus: appliedFilters.occupancyStatus }
        : {}),
      ...(appliedFilters.zoneId ? { zoneId: appliedFilters.zoneId } : {}),
      ...(appliedFilters.rackId ? { rackId: appliedFilters.rackId } : {}),
    }),
    [appliedFilters, debouncedSearchText, page, pageSize]
  )
  const locationsQuery = useWarehouseLocationsQuery(warehouseId, query)
  const layoutQuery = useWarehouseLayoutQuery(warehouseId, true)
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const listExport = useListExport({
    dataset: 'locations',
    filters: { ...query, warehouseId },
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.WAREHOUSES_VIEW,
    totalCount: locationsQuery.data?.totalCount ?? 0,
    isFetching: locationsQuery.isFetching,
    isError: locationsQuery.isError,
    blocked: searchText.trim() !== debouncedSearchText,
  })
  return (
    <WarehouseLocationDirectory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      warehouseId={warehouseId}
      locations={locationsQuery.data?.items ?? []}
      zones={layoutQuery.data ?? []}
      totalCount={locationsQuery.data?.totalCount ?? 0}
      page={page}
      pageSize={pageSize}
      searchText={searchText}
      filters={filters}
      activeFilterCount={activeFilterCount}
      isLoading={locationsQuery.isLoading}
      isFetching={locationsQuery.isFetching}
      isError={locationsQuery.isError}
      isFilterMetadataLoading={layoutQuery.isLoading}
      isFilterMetadataError={layoutQuery.isError}
      canGenerateBarcode={capabilities.canGenerateLocationBarcode}
      onSearchTextChange={(value) => {
        setSearchText(value)
        setPage(1)
      }}
      onFiltersChange={setFilters}
      onApplyFilters={() => {
        setAppliedFilters(filters)
        setPage(1)
      }}
      onResetFilters={resetFilters}
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onRetry={() => void Promise.all([locationsQuery.refetch(), layoutQuery.refetch()])}
      onRetryFilterMetadata={() => void layoutQuery.refetch()}
    />
  )
}
