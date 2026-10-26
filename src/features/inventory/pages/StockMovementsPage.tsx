'use client'

import { P } from '@/config/permissionCodes'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import {
  useWarehouseLocationsQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import { StockMovementHistory } from '../components/StockMovementsPage'
import { useStockMovementsQuery } from '../hooks/use-inventory'
import type { StockMovementType } from '../types/inventory.types'
import {
  buildStockMovementQuery,
  isStockMovementDateRangeValid,
} from '../utils/stock-movement-query'

export default function StockMovementsPage() {
  const meQuery = useMeQuery()
  const [searchText, setSearchText] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [productId, setProductId] = useState('')
  const [movementType, setMovementType] = useState<StockMovementType | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 350)
  const isDateRangeValid = isStockMovementDateRangeValid(dateFrom, dateTo)
  const movementParams = useMemo(
    () =>
      buildStockMovementQuery(
        {
          searchTerm: debouncedSearchText,
          warehouseId,
          slotId,
          productId,
          movementType,
          dateFrom,
          dateTo,
        },
        page,
        pageSize
      ),
    [
      dateFrom,
      dateTo,
      debouncedSearchText,
      movementType,
      page,
      pageSize,
      productId,
      slotId,
      warehouseId,
    ]
  )
  const movementsQuery = useStockMovementsQuery(movementParams, isDateRangeValid)
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const slotsQuery = useWarehouseLocationsQuery(warehouseId, {
    top: 200,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
  })
  const productsQuery = useProductOptionsQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )
  const slotOptions = useMemo(
    () => (slotsQuery.data?.items ?? []).map((slot) => ({ value: slot.id, label: slot.code })),
    [slotsQuery.data?.items]
  )
  const productOptions = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        value: product.id,
        label: `${product.sku} · ${product.productName}`,
      })),
    [productsQuery.data?.items]
  )

  function updateFilter<T>(setValue: (value: T) => void, value: T) {
    setValue(value)
    setPage(1)
  }

  const listExport = useListExport({
    dataset: 'movements',
    filters: movementParams,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.INVENTORY_VIEW,
    totalCount: movementsQuery.data?.totalCount ?? 0,
    isFetching: movementsQuery.isFetching,
    isError: movementsQuery.isError,
    blocked: !isDateRangeValid || searchText.trim() !== debouncedSearchText,
  })
  return (
    <StockMovementHistory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      permissions={meQuery.data?.permissions ?? []}
      items={movementsQuery.data?.items ?? []}
      totalCount={movementsQuery.data?.totalCount ?? 0}
      page={page}
      pageSize={pageSize}
      searchText={searchText}
      warehouseId={warehouseId}
      slotId={slotId}
      productId={productId}
      movementType={movementType}
      dateFrom={dateFrom}
      dateTo={dateTo}
      productOptions={productOptions}
      warehouseOptions={warehouseOptions}
      slotOptions={slotOptions}
      isLoading={movementsQuery.isLoading && isDateRangeValid}
      isFetching={movementsQuery.isFetching}
      isError={movementsQuery.isError}
      isDateRangeValid={isDateRangeValid}
      areProductsLoading={productsQuery.isLoading}
      areProductsError={productsQuery.isError}
      areLocationsLoading={warehousesQuery.isLoading || slotsQuery.isLoading}
      areLocationsError={warehousesQuery.isError || slotsQuery.isError}
      activeFilterCount={
        Number(Boolean(searchText)) +
        Number(Boolean(warehouseId)) +
        Number(Boolean(slotId)) +
        Number(Boolean(productId)) +
        Number(Boolean(movementType)) +
        Number(Boolean(dateFrom)) +
        Number(Boolean(dateTo))
      }
      onSearchChange={(value) => updateFilter(setSearchText, value)}
      onWarehouseChange={(value) => {
        updateFilter(setWarehouseId, value)
        setSlotId('')
      }}
      onSlotChange={(value) => updateFilter(setSlotId, value)}
      onProductChange={(value) => updateFilter(setProductId, value)}
      onMovementTypeChange={(value) => updateFilter(setMovementType, value)}
      onDateFromChange={(value) => updateFilter(setDateFrom, value)}
      onDateToChange={(value) => updateFilter(setDateTo, value)}
      onResetFilters={() => {
        setSearchText('')
        setWarehouseId('')
        setSlotId('')
        setProductId('')
        setMovementType('')
        setDateFrom('')
        setDateTo('')
        setPage(1)
      }}
      onRetryProducts={() => void productsQuery.refetch()}
      onRetryLocations={() => {
        void warehousesQuery.refetch()
        void slotsQuery.refetch()
      }}
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onRetry={() => void movementsQuery.refetch()}
    />
  )
}
