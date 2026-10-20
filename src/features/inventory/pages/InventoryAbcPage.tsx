'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { InventoryAbcDirectory } from '../components/InventoryAbcPage'
import {
  useApplyInventoryAbcMutation,
  useInventoryAbcQuery,
  useRunInventoryAbcMutation,
} from '../hooks/use-inventory'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { getApiErrorMessage } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'

export default function InventoryAbcPage() {
  const meQuery = useMeQuery()
  const router = useRouter()
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [historicalPeriodDays, setHistoricalPeriodDays] = useState(90)
  const [metric, setMetric] = useState<'Quantity' | 'Activity'>('Quantity')
  const [aThreshold, setAThreshold] = useState(80)
  const [bThreshold, setBThreshold] = useState(95)
  const [assignedTo, setAssignedTo] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const params = useMemo(() => ({ warehouseId }), [warehouseId])
  const abcQuery = useInventoryAbcQuery(params, Boolean(warehouseId))
  const runMutation = useRunInventoryAbcMutation()
  const applyMutation = useApplyInventoryAbcMutation()
  const staffQuery = useStaffListQuery(STAFF_DIRECTORY_KINDS.staff, {
    top: 100,
    skip: 0,
    needTotalCount: true,
  })
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
  const staffOptions = useMemo(
    () =>
      (staffQuery.data?.items ?? [])
        .filter(
          (staff) => staff.status === 'Active' && staff.assignedWarehouseIds.includes(warehouseId)
        )
        .map((staff) => ({ value: staff.id, label: `${staff.fullName} · ${staff.email}` })),
    [staffQuery.data?.items, warehouseId]
  )
  const analysisId = abcQuery.data?.[0]?.analysisId ?? null
  const analysisVersion = abcQuery.data?.[0]?.version ?? null

  const listExport = useListExport({
    dataset: 'abc',
    filters: {
      warehouseId,
      analysisId,
      datasetFingerprint: abcQuery.data?.[0]?.datasetFingerprint,
      version: analysisVersion,
    },
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.INVENTORY_VIEW,
    totalCount: abcQuery.data?.length ?? 0,
    isFetching: abcQuery.isFetching,
    isError: abcQuery.isError,
    blocked: !analysisId || !analysisVersion || runMutation.isPending || applyMutation.isPending,
  })
  return (
    <InventoryAbcDirectory
      exportAction={
        listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
      }
      permissions={meQuery.data?.permissions ?? []}
      items={abcQuery.data ?? []}
      page={page}
      pageSize={pageSize}
      warehouseId={warehouseId}
      warehouseOptions={warehouseOptions}
      isLoading={abcQuery.isLoading}
      isFetching={abcQuery.isFetching}
      isError={abcQuery.isError}
      areWarehousesLoading={warehousesQuery.isLoading}
      areWarehousesError={warehousesQuery.isError}
      onWarehouseChange={(value) => {
        setWarehouseId(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPage(1)
      }}
      onRetryWarehouses={() => void warehousesQuery.refetch()}
      onRetry={() => void abcQuery.refetch()}
      historicalPeriodDays={historicalPeriodDays}
      metric={metric}
      aThreshold={aThreshold}
      bThreshold={bThreshold}
      isRunning={runMutation.isPending}
      canRun={meQuery.data?.permissions.includes(P.PRODUCTS_CONFIGURE_POLICY) ?? false}
      canCreateCycleCount={meQuery.data?.permissions.includes(P.CYCLE_COUNTS_CREATE) ?? false}
      analysisId={analysisId}
      datasetFingerprint={abcQuery.data?.[0]?.datasetFingerprint ?? null}
      appliedCycleCountId={abcQuery.data?.[0]?.appliedCycleCountId ?? null}
      staffOptions={staffOptions}
      assignedTo={assignedTo}
      scheduledDate={scheduledDate}
      isApplying={applyMutation.isPending}
      onAssignedToChange={setAssignedTo}
      onScheduledDateChange={setScheduledDate}
      onApply={() => {
        if (!analysisId || !analysisVersion || !assignedTo || !scheduledDate) return
        void applyMutation
          .mutateAsync({
            analysisId,
            expectedVersion: analysisVersion,
            assignedTo,
            scheduledDate: new Date(scheduledDate).toISOString(),
            classes: ['A'],
          })
          .then((response) => {
            toast.success('Đã tạo phiếu kiểm kê từ snapshot nhóm A.')
            router.push(APP_ROUTES.cycleCountDetail(response.data))
          })
          .catch(() => toast.error('Không thể tạo phiếu kiểm kê từ snapshot ABC.'))
      }}
      onHistoricalPeriodDaysChange={setHistoricalPeriodDays}
      onMetricChange={setMetric}
      onAThresholdChange={setAThreshold}
      onBThresholdChange={setBThreshold}
      onRun={() => {
        if (
          !warehouseId ||
          historicalPeriodDays < 1 ||
          historicalPeriodDays > 366 ||
          aThreshold >= bThreshold
        )
          return
        void runMutation
          .mutateAsync({ warehouseId, historicalPeriodDays, metric, aThreshold, bThreshold })
          .then(() => toast.success('Đã hoàn tất phân tích ưu tiên kiểm đếm.'))
          .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể chạy phân loại ABC.')))
      }}
    />
  )
}
