'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { P } from '@/config/permissionCodes'
import { ROUTE_CAPABILITIES } from '@/config/route-permissions'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { getApiErrorMessage } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { APP_ROUTES } from '@/routes/app-routes'
import { InventoryAnomalyWorkspace } from '../components/InventoryAnomaliesPage'
import {
  useInventoryAnomaliesQuery,
  useInventoryAnomalySummaryQuery,
  useReviewInventoryAnomalyMutation,
  useStartAnomalyScanMutation,
} from '../hooks/use-inventory-anomalies'
import {
  reviewInventoryAnomalySchema,
  type ReviewInventoryAnomalyFormValues,
} from '../schemas/review-inventory-anomaly.schema'
import type {
  AnomalyReviewStatus,
  AnomalySeverity,
  InventoryAnomaly,
} from '../types/inventory-anomaly.types'

export default function InventoryAnomaliesPage() {
  const queryClient = useQueryClient()
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const canView = permissions.includes(ROUTE_CAPABILITIES[APP_ROUTES.inventoryAnomalies])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [severity, setSeverity] = useState<AnomalySeverity | ''>('')
  const [reviewStatus, setReviewStatus] = useState<AnomalyReviewStatus | ''>('Open')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<InventoryAnomaly | null>(null)
  const reviewForm = useForm<ReviewInventoryAnomalyFormValues>({
    resolver: zodResolver(reviewInventoryAnomalySchema),
    defaultValues: { decision: 'Dismissed', note: '' },
  })

  const warehousesQuery = useWarehousesQuery(
    { top: 100, skip: 0, needTotalCount: true, isActive: true },
    canView
  )
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )
  // Scans and alerts are per warehouse; until the user picks one, show the first.
  const warehouseId = selectedWarehouseId || warehouseOptions[0]?.value || ''
  const summaryQuery = useInventoryAnomalySummaryQuery(warehouseId, canView && Boolean(warehouseId))
  const listParams = useMemo(
    () => ({
      warehouseId,
      severity: severity || undefined,
      reviewStatus: reviewStatus || undefined,
      pageNumber: page,
      pageSize,
    }),
    [page, pageSize, reviewStatus, severity, warehouseId]
  )
  const anomaliesQuery = useInventoryAnomaliesQuery(listParams, canView && Boolean(warehouseId))
  const startScan = useStartAnomalyScanMutation()
  const review = useReviewInventoryAnomalyMutation()

  // A scan runs in the background: when it stops running, its alerts are new rows in the list.
  const scanStatus = summaryQuery.data?.latestScan?.status
  const previousScanStatus = useRef(scanStatus)
  useEffect(() => {
    if (previousScanStatus.current === 'Running' && scanStatus && scanStatus !== 'Running')
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventoryAnomalies.all })
    previousScanStatus.current = scanStatus
  }, [queryClient, scanStatus])

  if (meQuery.isPending)
    return <Skeleton className="h-full min-h-64 w-full" aria-label="Đang kiểm tra quyền" />
  if (meQuery.isError || !canView)
    return <p role="status">Bạn không có quyền xem bất thường tồn kho.</p>

  function resetPage<T>(setValue: (value: T) => void, value: T) {
    setValue(value)
    setPage(1)
  }

  function openAnomaly(anomaly: InventoryAnomaly | null) {
    reviewForm.reset({ decision: 'Dismissed', note: '' })
    setSelected(anomaly)
  }

  async function submitReview(values: ReviewInventoryAnomalyFormValues) {
    if (!selected) return
    try {
      const reviewed = await review.mutateAsync({
        id: selected.id,
        request: { decision: values.decision, note: values.note || null },
      })
      setSelected(reviewed)
      toast.success(
        values.decision === 'Confirmed'
          ? 'Đã xác nhận cảnh báo là bất thường.'
          : 'Đã đánh dấu cảnh báo là bình thường.'
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu kết luận. Vui lòng thử lại.'))
      setSelected(null)
    }
  }

  async function scanNow() {
    try {
      await startScan.mutateAsync(warehouseId)
      toast.success('Đã bắt đầu quét. Cảnh báo mới sẽ hiện khi quét xong.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể bắt đầu quét. Vui lòng thử lại.'))
    }
  }

  return (
    <InventoryAnomalyWorkspace
      permissions={permissions}
      overview={{
        summary: summaryQuery.data,
        isLoading: warehousesQuery.isLoading || summaryQuery.isLoading,
        isError: warehousesQuery.isError || summaryQuery.isError,
        hasWarehouse: Boolean(warehouseId),
        canScan: permissions.includes(P.INVENTORY_ANOMALIES_SCAN),
        isStarting: startScan.isPending,
        onScan: () => void scanNow(),
        onRetry: () => {
          void warehousesQuery.refetch()
          void summaryQuery.refetch()
        },
      }}
      detail={{
        anomaly: selected,
        form: reviewForm,
        canReview: permissions.includes(P.INVENTORY_ANOMALIES_REVIEW),
        isPending: review.isPending,
        onOpenChange: (open) => {
          if (!open) openAnomaly(null)
        },
        onSubmit: submitReview,
      }}
      warehouseOptions={warehouseOptions}
      warehouseId={warehouseId}
      severity={severity}
      reviewStatus={reviewStatus}
      items={anomaliesQuery.data?.items ?? []}
      totalCount={anomaliesQuery.data?.totalCount ?? 0}
      page={page}
      pageSize={pageSize}
      isLoading={warehousesQuery.isLoading || anomaliesQuery.isLoading}
      isFetching={anomaliesQuery.isFetching}
      isError={anomaliesQuery.isError}
      onWarehouseChange={(value) => resetPage(setSelectedWarehouseId, value)}
      onSeverityChange={(value) => resetPage(setSeverity, value)}
      onReviewStatusChange={(value) => resetPage(setReviewStatus, value)}
      onSelect={openAnomaly}
      onPageChange={setPage}
      onPageSizeChange={(value) => resetPage(setPageSize, value)}
      onRetry={() => {
        void anomaliesQuery.refetch()
        void summaryQuery.refetch()
      }}
    />
  )
}
