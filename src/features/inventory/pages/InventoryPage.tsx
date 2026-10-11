'use client'

import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import { InventoryDirectory, ReportDamagedStockDialog } from '../components/InventoryPage'
import {
  useInventoryQuery,
  useInventorySlotOptionsQuery,
  useInventoryWarehouseOptionsQuery,
  useMyWarehouseTasksQuery,
  useReportDamagedStockMutation,
  useUploadInventoryEvidenceMutation,
} from '../hooks/use-inventory'
import {
  reportDamagedStockSchema,
  type ReportDamagedStockFormValues,
} from '../schemas/report-damaged-stock.schema'
import type { InventoryStock } from '../types/inventory.types'
import { buildInventoryQuery } from '../utils/inventory-query'
import { formatInventoryLocation } from '../utils/inventory-format'

export default function InventoryPage({
  initialWarehouseId,
  initialProductId,
}: { readonly initialWarehouseId?: string; readonly initialProductId?: string } = {}) {
  const [searchText, setSearchText] = useState('')
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ?? '')
  const [productId, setProductId] = useState(initialProductId ?? '')
  const [slotId, setSlotId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [damagedStock, setDamagedStock] = useState<InventoryStock | null>(null)
  const meQuery = useMeQuery()
  const canViewWarehouseTasks =
    meQuery.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) ?? false
  const damagedMutation = useReportDamagedStockMutation()
  const evidenceMutation = useUploadInventoryEvidenceMutation()
  const tasksQuery = useMyWarehouseTasksQuery(
    damagedStock?.warehouseId,
    Boolean(damagedStock) && canViewWarehouseTasks
  )
  const damagedForm = useForm<ReportDamagedStockFormValues>({
    resolver: zodResolver(reportDamagedStockSchema),
    defaultValues: { reportMode: 'Confirmed', quantity: 1, reason: '' },
  })
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const inventoryParams = useMemo(
    () =>
      buildInventoryQuery(
        { searchTerm: debouncedSearchText, warehouseId, productId, slotId },
        page,
        pageSize
      ),
    [debouncedSearchText, page, pageSize, productId, slotId, warehouseId]
  )
  const inventoryQuery = useInventoryQuery(inventoryParams)
  const warehousesQuery = useInventoryWarehouseOptionsQuery()
  const productsQuery = useProductOptionsQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const slotsQuery = useInventorySlotOptionsQuery(warehouseId)
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}${warehouse.canManageWarehouse ? '' : ' · Chỉ xem'}`,
      })),
    [warehousesQuery.data]
  )
  const productOptions = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        value: product.id,
        label: `${product.sku} · ${product.productName}`,
      })),
    [productsQuery.data?.items]
  )
  const slotOptions = useMemo(
    () =>
      (slotsQuery.data ?? []).map((slot) => ({
        value: slot.id,
        label: formatInventoryLocation(slot),
      })),
    [slotsQuery.data]
  )

  function updateFilter(setValue: (value: string) => void, value: string) {
    setValue(value)
    setPage(1)
  }

  function handleDamagedDialogOpenChange(open: boolean) {
    if (!open) {
      setDamagedStock(null)
      damagedForm.reset({ reportMode: 'Confirmed', quantity: 1, reason: '' })
    }
  }

  async function handleReportDamaged(values: ReportDamagedStockFormValues) {
    if (!damagedStock) return
    if (values.reportMode === 'Confirmed' && !damagedStock.version) {
      toast.error('Dữ liệu tồn kho chưa có phiên bản. Vui lòng tải lại trang.')
      return
    }
    if (
      values.reportMode === 'Confirmed' &&
      (values.quantity ?? 0) > damagedStock.availableQuantity
    ) {
      damagedForm.setError('quantity', {
        message: `Chỉ có ${damagedStock.availableQuantity} đơn vị chưa được giữ.`,
      })
      return
    }
    try {
      const upload = await evidenceMutation.mutateAsync({
        warehouseId: damagedStock.warehouseId,
        file: values.evidenceFile,
      })
      await damagedMutation.mutateAsync({
        productId: damagedStock.productId,
        warehouseId: damagedStock.warehouseId,
        slotId: damagedStock.slotId,
        ...(damagedStock.lotId ? { lotId: damagedStock.lotId } : {}),
        ...(values.reportMode === 'Confirmed' && values.quantity
          ? { quantity: values.quantity }
          : {}),
        reason: values.reason.trim(),
        commandId: crypto.randomUUID(),
        ...(values.reportMode === 'Confirmed' && damagedStock.version
          ? { expectedStockVersion: damagedStock.version }
          : {}),
        evidenceIds: [upload.data.id],
        ...(values.relatedTaskKey
          ? {
              relatedTaskType: values.relatedTaskKey.split(':')[0],
              relatedTaskId: values.relatedTaskKey.split(':')[1],
            }
          : {}),
      })
      toast.success(
        values.reportMode === 'Confirmed'
          ? 'Đã ghi nhận hàng hỏng và chuyển số lượng xác nhận sang trạng thái giữ.'
          : 'Đã ghi nhận quan sát. Tồn kho chưa thay đổi cho đến khi xác nhận số lượng.'
      )
      handleDamagedDialogOpenChange(false)
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Không thể ghi nhận hàng hỏng. Vui lòng thử lại.'
      toast.error(message)
    }
  }

  return (
    <>
      <InventoryDirectory
        permissions={meQuery.data?.permissions ?? []}
        items={inventoryQuery.data?.items ?? []}
        totalCount={inventoryQuery.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        warehouseId={warehouseId}
        productId={productId}
        slotId={slotId}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        slotOptions={slotOptions}
        snapshotAt={inventoryQuery.data?.snapshotAt ?? null}
        isLoading={inventoryQuery.isLoading}
        isFetching={inventoryQuery.isFetching}
        isError={inventoryQuery.isError}
        areFiltersLoading={
          warehousesQuery.isLoading || productsQuery.isLoading || slotsQuery.isLoading
        }
        areFiltersError={warehousesQuery.isError || productsQuery.isError || slotsQuery.isError}
        activeFilterCount={
          Number(Boolean(warehouseId)) + Number(Boolean(productId)) + Number(Boolean(slotId))
        }
        canReportDamaged={meQuery.data?.permissions.includes(P.INVENTORY_REPORT_DAMAGED) ?? false}
        onSearchChange={(value) => updateFilter(setSearchText, value)}
        onWarehouseChange={(value) => {
          updateFilter(setWarehouseId, value)
          setSlotId('')
        }}
        onProductChange={(value) => updateFilter(setProductId, value)}
        onSlotChange={(value) => updateFilter(setSlotId, value)}
        onResetFilters={() => {
          setWarehouseId('')
          setProductId('')
          setSlotId('')
          setPage(1)
        }}
        onRetryFilters={() => {
          void Promise.all([
            ...(warehousesQuery.isError ? [warehousesQuery.refetch()] : []),
            ...(productsQuery.isError ? [productsQuery.refetch()] : []),
            ...(warehouseId && slotsQuery.isError ? [slotsQuery.refetch()] : []),
          ])
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onRetry={() => void inventoryQuery.refetch()}
        onReportDamaged={setDamagedStock}
      />
      <ReportDamagedStockDialog
        item={damagedStock}
        form={damagedForm}
        isPending={evidenceMutation.isPending || damagedMutation.isPending}
        canLinkTask={canViewWarehouseTasks}
        taskOptions={(tasksQuery.data?.items ?? []).map((task) => ({
          value: `${task.taskType}:${task.id}`,
          label: `${task.referenceCode} · ${task.title} · ${task.executionStatus}`,
        }))}
        onOpenChange={handleDamagedDialogOpenChange}
        onSubmit={handleReportDamaged}
      />
    </>
  )
}
