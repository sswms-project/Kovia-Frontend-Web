'use client'

import { useMemo, useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { InventoryReservationDirectory } from '../components/InventoryReservationsPage'
import { useInventoryReservationsQuery } from '../hooks/use-inventory'
import type { InventoryReservationStatus } from '../types/inventory.types'
import { buildInventoryReservationQuery } from '../utils/inventory-reservation-query'

export default function InventoryReservationsPage() {
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [status, setStatus] = useState<InventoryReservationStatus>('Active')
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
  const productsQuery = useProductOptionsQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )
  const productOptions = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        value: product.id,
        label: `${product.sku} · ${product.productName}`,
      })),
    [productsQuery.data?.items]
  )

  return (
    <InventoryReservationDirectory
      permissions={meQuery.data?.permissions ?? []}
      items={reservationsQuery.data?.items ?? []}
      page={page}
      pageSize={pageSize}
      totalCount={reservationsQuery.data?.totalCount ?? 0}
      warehouseId={warehouseId}
      productId={productId}
      status={status}
      warehouseOptions={warehouseOptions}
      productOptions={productOptions}
      isLoading={reservationsQuery.isLoading}
      isFetching={reservationsQuery.isFetching}
      isError={reservationsQuery.isError}
      areFiltersLoading={warehousesQuery.isLoading || productsQuery.isLoading}
      areFiltersError={warehousesQuery.isError || productsQuery.isError}
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
        setWarehouseId('')
        setProductId('')
        setStatus('Active')
        setPage(1)
      }}
      onRetryFilters={() => void Promise.all([warehousesQuery.refetch(), productsQuery.refetch()])}
      onRetry={() => void reservationsQuery.refetch()}
    />
  )
}
