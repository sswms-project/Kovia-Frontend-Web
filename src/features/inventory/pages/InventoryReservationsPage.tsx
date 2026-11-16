'use client'

import { useInventoryProductLookup } from '../hooks/use-inventory-product-lookup'
import { useInventoryFilter } from '@/features/inventory/hooks/use-inventory-filter'

import { P } from '@/config/permissionCodes'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { InventoryReservationDirectory } from '../components/InventoryReservationsPage'
import { useInventoryReservationsQuery } from '../hooks/use-inventory'
import type { InventoryReservationStatus } from '../types/inventory.types'
import { buildInventoryReservationQuery } from '../utils/inventory-reservation-query'

export default function InventoryReservationsPage() {
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useInventoryFilter<string>('warehouse', '')
  const [productId, setProductId] = useInventoryFilter<string>(
    'InventoryReservationsPage.productId',
    ''
  )
  const productLookup = useInventoryProductLookup(
    'InventoryReservationsPage.productLabel',
    productId
  )
  const [status, setStatus] = useInventoryFilter<InventoryReservationStatus>(
    'InventoryReservationsPage.status',
    'Active'
  )
  const [pageSize, setPageSize] = useState(20)
  const meQuery = useMeQuery()
  const params = useMemo(
    () => buildInventoryReservationQuery(warehouseId, productId, status, page, pageSize),
    [page, pageSize, productId, status, warehouseId]
  )
  const reservationsQuery = useInventoryReservationsQuery(params)
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )

  const listExport = useListExport({
    dataset: 'reservations',
    filters: params,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.INVENTORY_VIEW,
    totalCount: reservationsQuery.data?.totalCount ?? 0,
    isFetching: reservationsQuery.isFetching,
    isError: reservationsQuery.isError,
  })
  return (
    <InventoryReservationDirectory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      permissions={meQuery.data?.permissions ?? []}
      items={reservationsQuery.data?.items ?? []}
      page={page}
      pageSize={pageSize}
      totalCount={reservationsQuery.data?.totalCount ?? 0}
      warehouseId={warehouseId}
      productId={productId}
      status={status}
      warehouseOptions={warehouseOptions}
      productLookup={productLookup}
      isLoading={reservationsQuery.isLoading}
      isFetching={reservationsQuery.isFetching}
      isError={reservationsQuery.isError}
      areFiltersLoading={warehousesQuery.isLoading}
      areFiltersError={warehousesQuery.isError}
      activeFilterCount={
        Number(Boolean(warehouseId)) + Number(Boolean(productId)) + Number(status !== 'Active')
      }
      onWarehouseChange={(value) => {
        setWarehouseId(value)
        setPage(1)
      }}
      onProductChange={(value) => {
        setProductId(value)
        setPage(1)
      }}
      onStatusChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onResetFilters={() => {
        setProductId('')
        setStatus('Active')
        setPage(1)
      }}
      onRetryFilters={() => void warehousesQuery.refetch()}
      onRetry={() => void reservationsQuery.refetch()}
    />
  )
}
