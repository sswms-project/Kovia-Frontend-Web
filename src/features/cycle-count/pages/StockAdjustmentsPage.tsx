'use client'

import { useMemo, useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { StockAdjustmentDirectory } from '../components/StockAdjustmentViews'
import { useStockAdjustmentVouchersQuery } from '../hooks/use-cycle-count'
import type { StockAdjustmentStatus } from '../types/cycle-count.types'

export default function StockAdjustmentsPage() {
  const me = useMeQuery()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [warehouseId, setWarehouseId] = useState('')
  const [status, setStatus] = useState<'' | StockAdjustmentStatus>('')
  const params = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      ...(warehouseId ? { warehouseId } : {}),
      ...(status ? { status } : {}),
    }),
    [page, pageSize, warehouseId, status]
  )
  const query = useStockAdjustmentVouchersQuery(params)
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const options = useMemo(
    () =>
      (warehouses.data?.items ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} · ${w.warehouseName}`,
      })),
    [warehouses.data?.items]
  )
  return (
    <StockAdjustmentDirectory
      permissions={me.data?.permissions ?? []}
      items={query.data?.items ?? []}
      totalCount={query.data?.totalCount ?? 0}
      page={page}
      pageSize={pageSize}
      warehouseId={warehouseId}
      status={status}
      warehouses={options}
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
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onRetry={() => void query.refetch()}
    />
  )
}
