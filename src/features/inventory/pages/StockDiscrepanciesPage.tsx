'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'
import {
  toOperationalDateTimeStart,
  toOperationalDateTimeEnd,
} from '@/features/inbound-request/utils/inbound-request-format'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import { useProductLotsQuery } from '@/features/product/hooks/use-products'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import {
  useWarehouseLocationsQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import { StockDiscrepancyDirectory } from '../components/StockDiscrepanciesPage'
import {
  useAddStockDiscrepancyEvidenceMutation,
  useCreateStockDiscrepancyMutation,
  useMyWarehouseTasksQuery,
  useReviewStockDiscrepancyMutation,
  useStockDiscrepanciesQuery,
  useUploadInventoryEvidenceMutation,
} from '../hooks/use-inventory'
import type {
  StockDiscrepancy,
  StockDiscrepancyReviewAction,
  StockDiscrepancyStatus,
  StockDiscrepancyType,
} from '../types/inventory.types'

export default function StockDiscrepanciesPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [filterWarehouseId, setFilterWarehouseId] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  const [status, setStatus] = useState<StockDiscrepancyStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const exportFilters = {
    pageNumber: page,
    pageSize: 20,
    ...(filterWarehouseId ? { warehouseId: filterWarehouseId } : {}),
    ...(filterProductId ? { productId: filterProductId } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom: toOperationalDateTimeStart(dateFrom) } : {}),
    ...(dateTo ? { dateTo: toOperationalDateTimeEnd(dateTo) } : {}),
  }
  const reportsQuery = useStockDiscrepanciesQuery(exportFilters)
  const uploadMutation = useUploadInventoryEvidenceMutation()
  const createMutation = useCreateStockDiscrepancyMutation()
  const reviewMutation = useReviewStockDiscrepancyMutation()
  const evidenceMutation = useAddStockDiscrepancyEvidenceMutation()
  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [lotId, setLotId] = useState('')
  const [correctSlotId, setCorrectSlotId] = useState('')
  const [relatedTaskKey, setRelatedTaskKey] = useState('')
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const products = useProductOptionsQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const slots = useWarehouseLocationsQuery(warehouseId, {
    top: 200,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
  })
  const lots = useProductLotsQuery(
    productId,
    { warehouseId, status: 'Active' },
    Boolean(productId && warehouseId)
  )
  const staff = useStaffListQuery(STAFF_DIRECTORY_KINDS.staff, {
    top: 100,
    skip: 0,
    needTotalCount: true,
  })
  const canViewWarehouseTasks =
    meQuery.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN) ?? false
  const tasks = useMyWarehouseTasksQuery(warehouseId, Boolean(warehouseId) && canViewWarehouseTasks)
  const warehouseOptions = useMemo(
    () =>
      (warehouses.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.warehouseCode} · ${item.warehouseName}`,
      })),
    [warehouses.data?.items]
  )
  const productOptions = useMemo(
    () =>
      (products.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.sku} · ${item.productName}`,
      })),
    [products.data?.items]
  )
  const slotOptions = useMemo(
    () => (slots.data?.items ?? []).map((item) => ({ value: item.id, label: item.code })),
    [slots.data?.items]
  )
  const lotOptions = useMemo(
    () => (lots.data ?? []).map((item) => ({ value: item.id, label: item.lotNumber })),
    [lots.data]
  )
  const staffOptions = useMemo(
    () =>
      (staff.data?.items ?? [])
        .filter(
          (item) =>
            item.status === 'Active' &&
            item.assignedWarehouseIds.includes(filterWarehouseId || warehouseId)
        )
        .map((item) => ({ value: item.id, label: `${item.fullName} · ${item.email}` })),
    [staff.data?.items, filterWarehouseId, warehouseId]
  )
  const taskOptions = useMemo(
    () =>
      (tasks.data?.items ?? []).map((task) => ({
        value: `${task.taskType}:${task.id}`,
        label: `${task.referenceCode} · ${task.title} · ${task.executionStatus}`,
      })),
    [tasks.data?.items]
  )
  async function create(values: {
    type: StockDiscrepancyType
    difference: number
    description: string
    file: File
  }) {
    try {
      const upload = await uploadMutation.mutateAsync({ warehouseId, file: values.file })
      await createMutation.mutateAsync({
        warehouseId,
        productId,
        slotId,
        ...(lotId ? { lotId } : {}),
        ...(values.type === 'WrongLocation' && correctSlotId ? { correctSlotId } : {}),
        ...(relatedTaskKey
          ? {
              relatedTaskType: relatedTaskKey.split(':')[0],
              relatedTaskId: relatedTaskKey.split(':')[1],
            }
          : {}),
        type: values.type,
        observedDifference: values.difference,
        description: values.description.trim(),
        evidenceIds: [upload.data.id],
        commandId: crypto.randomUUID(),
      })
      toast.success(
        'Đã gửi báo cáo chênh lệch. Tồn kho chưa thay đổi; mọi điều chỉnh phải qua quy trình duyệt riêng.'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi báo cáo chênh lệch.')
      throw error
    }
  }
  async function review(
    item: StockDiscrepancy,
    action: StockDiscrepancyReviewAction,
    reason: string,
    duplicateReportId?: string,
    responsibleUserId?: string
  ) {
    if (!item.version) {
      toast.error('Báo cáo chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      await reviewMutation.mutateAsync({
        reportId: item.id,
        action,
        reason: reason.trim(),
        commandId: crypto.randomUUID(),
        expectedVersion: item.version,
        ...(duplicateReportId ? { duplicateReportId } : {}),
        ...(responsibleUserId ? { responsibleUserId } : {}),
      })
      toast.success('Đã ghi nhận quyết định xử lý.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý báo cáo.')
      throw error
    }
  }
  async function addEvidence(item: StockDiscrepancy, file: File) {
    if (!item.version) {
      toast.error('Báo cáo chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      const upload = await uploadMutation.mutateAsync({ warehouseId: item.warehouseId, file })
      await evidenceMutation.mutateAsync({
        reportId: item.id,
        evidenceIds: [upload.data.id],
        expectedVersion: item.version,
      })
      toast.success('Đã bổ sung bằng chứng và gửi lại báo cáo để xem xét.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể bổ sung bằng chứng.')
      throw error
    }
  }
  const permissions = meQuery.data?.permissions ?? []
  const listExport = useListExport({
    dataset: 'discrepancies',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.INVENTORY_VIEW,
    totalCount: reportsQuery.data?.totalCount ?? 0,
    isFetching: reportsQuery.isFetching,
    isError: reportsQuery.isError,
  })
  return (
    <StockDiscrepancyDirectory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      permissions={permissions}
      currentUserId={meQuery.data?.id ?? null}
      items={reportsQuery.data?.items ?? []}
      page={reportsQuery.data?.pageNumber ?? page}
      pageSize={reportsQuery.data?.pageSize ?? 20}
      totalCount={reportsQuery.data?.totalCount ?? 0}
      filterWarehouseId={filterWarehouseId}
      filterProductId={filterProductId}
      statusFilter={status}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={(value) => {
        setDateFrom(value)
        setPage(1)
      }}
      onDateToChange={(value) => {
        setDateTo(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onFilterWarehouseChange={(value) => {
        setFilterWarehouseId(value)
        setPage(1)
      }}
      onFilterProductChange={(value) => {
        setFilterProductId(value)
        setPage(1)
      }}
      onStatusFilterChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      warehouseOptions={warehouseOptions}
      productOptions={productOptions}
      slotOptions={slotOptions}
      lotOptions={lotOptions}
      staffOptions={staffOptions}
      taskOptions={taskOptions}
      canLinkTask={canViewWarehouseTasks}
      warehouseId={warehouseId}
      productId={productId}
      slotId={slotId}
      lotId={lotId}
      correctSlotId={correctSlotId}
      relatedTaskKey={relatedTaskKey}
      onWarehouseChange={(value) => {
        setWarehouseId(value)
        setSlotId('')
        setLotId('')
        setCorrectSlotId('')
        setRelatedTaskKey('')
      }}
      onProductChange={(value) => {
        setProductId(value)
        setLotId('')
      }}
      onSlotChange={setSlotId}
      onLotChange={setLotId}
      onCorrectSlotChange={setCorrectSlotId}
      onRelatedTaskChange={setRelatedTaskKey}
      isLoading={reportsQuery.isLoading}
      isFetching={reportsQuery.isFetching}
      isError={reportsQuery.isError}
      isPending={
        uploadMutation.isPending ||
        createMutation.isPending ||
        reviewMutation.isPending ||
        evidenceMutation.isPending
      }
      canReport={permissions.includes(P.INVENTORY_REPORT_DAMAGED)}
      canReview={permissions.includes(P.STOCK_ADJUSTMENTS_APPROVE)}
      onRetry={() => void reportsQuery.refetch()}
      onCreate={create}
      onReview={review}
      onAddEvidence={addEvidence}
    />
  )
}
