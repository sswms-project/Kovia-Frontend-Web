'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProductSuppliersQuery } from '@/features/product/hooks/use-products'
import { useWarehouseLocationsQuery } from '@/features/warehouse/hooks/use-warehouse'
import { downloadBulkImportFile } from '@/components/operations/bulk-import'
import { getApiErrorMessage, formatApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import {
  createForecastRunSchema,
  reviewReplenishmentSchema,
} from '../schemas/forecast-planning.schema'
import type {
  CreateForecastRunFormValues,
  ReviewReplenishmentFormValues,
} from '../schemas/forecast-planning.schema'
import type { RebalancingSuggestion, ReplenishmentSuggestion } from '../types/inventory.types'
import {
  buildForecastOverview,
  countForecastRisks,
  filterForecastOverview,
  forecastOverviewCsv,
} from '../utils/forecast-overview'
import type { ForecastRiskFilter } from '../utils/forecast-overview'
import {
  useCreateForecastRunMutation,
  useExecuteForecastRunMutation,
  useForecastRunQuery,
  useForecastRunsQuery,
  useAcceptReplenishmentSuggestionMutation,
  useRejectForecastSuggestionMutation,
  useEvaluateForecastRunMutation,
  useAcceptRebalancingSuggestionMutation,
} from './use-inventory'

export function useForecastWorkspace() {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState('')
  const [reviewId, setReviewId] = useState('')
  const [productId, setProductId] = useState('')
  const [transferSuggestion, setTransferSuggestion] = useState<RebalancingSuggestion | null>(null)
  const [destinationSlotId, setDestinationSlotId] = useState('')
  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewRisk, setOverviewRisk] = useState<ForecastRiskFilter>('all')
  const [overviewPage, setOverviewPage] = useState(1)
  const [overviewPageSize, setOverviewPageSize] = useState(20)
  const createForm = useForm<CreateForecastRunFormValues>({
    resolver: zodResolver(createForecastRunSchema),
    defaultValues: { warehouseId: '', historicalPeriodDays: 90, horizonDays: 14 },
  })
  const reviewForm = useForm<ReviewReplenishmentFormValues>({
    resolver: zodResolver(reviewReplenishmentSchema),
    defaultValues: { supplierId: '', adjustedQuantity: 1, adjustmentReason: '' },
  })
  const warehouseId = useWatch({ control: createForm.control, name: 'warehouseId' })
  const runsQuery = useForecastRunsQuery(warehouseId)
  const runQuery = useForecastRunQuery(runId)
  const createMutation = useCreateForecastRunMutation()
  const executeMutation = useExecuteForecastRunMutation()
  const acceptMutation = useAcceptReplenishmentSuggestionMutation(runId)
  const rejectMutation = useRejectForecastSuggestionMutation(runId)
  const evaluateMutation = useEvaluateForecastRunMutation()
  const transferMutation = useAcceptRebalancingSuggestionMutation(runId)
  // Read the refreshed server record instead of keeping an obsolete snapshot in selection state.
  const selected =
    runQuery.data?.replenishmentSuggestions.find((item) => item.id === reviewId) ?? null
  const run = runQuery.data
  const overviewRows = useMemo(() => (run ? buildForecastOverview(run) : []), [run])
  const overviewRiskCounts = useMemo(() => countForecastRisks(overviewRows), [overviewRows])
  const filteredOverview = useMemo(
    () => filterForecastOverview(overviewRows, overviewSearch, overviewRisk),
    [overviewRows, overviewSearch, overviewRisk]
  )
  const suppliersQuery = useProductSuppliersQuery(selected?.productId ?? '')
  const slotsQuery = useWarehouseLocationsQuery(transferSuggestion?.destinationWarehouseId ?? '', {
    top: 200,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
  })

  function reportError(error: unknown, fallback: string) {
    logger.error(formatApiError(error))
    toast.error(getApiErrorMessage(error, fallback))
  }
  function selectRun(id: string) {
    setRunId(id)
    setReviewId('')
    setProductId('')
    setTransferSuggestion(null)
    setOverviewSearch('')
    setOverviewRisk('all')
    setOverviewPage(1)
  }
  function exportOverview() {
    if (!run) return
    // BOM so Excel reads the Vietnamese headers as UTF-8.
    const blob = new Blob(
      [new Uint8Array([0xef, 0xbb, 0xbf]), forecastOverviewCsv(filteredOverview)],
      {
        type: 'text/csv;charset=utf-8',
      }
    )
    downloadBulkImportFile(blob, `du-bao-${run.forecastStartDate}.csv`)
  }
  function changeWarehouse(id: string) {
    createForm.setValue('warehouseId', id)
    selectRun('')
  }
  function openReview(item: ReplenishmentSuggestion) {
    setReviewId(item.id)
    reviewForm.reset({
      supplierId: item.supplierId ?? '',
      adjustedQuantity: item.draftQuantity ?? item.adjustedQuantity ?? item.suggestedQuantity,
      adjustmentReason: item.adjustmentReason ?? '',
    })
  }
  const createAndRun = createForm.handleSubmit(async (values) => {
    try {
      const response = await createMutation.mutateAsync(values)
      selectRun(response.data)
      await executeMutation.mutateAsync(response.data)
      await runsQuery.refetch()
      await queryClient.invalidateQueries({ queryKey: queryKeys.inboundRequests.all })
      toast.success('Đã tính nhu cầu và lập kế hoạch bổ sung. Hãy kiểm tra các nháp trước khi gửi.')
    } catch (error) {
      reportError(error, 'Không thể hoàn tất phiên dự báo.')
    }
  })
  const accept = reviewForm.handleSubmit(async (values) => {
    if (!selected) return
    if (values.adjustedQuantity !== selected.suggestedQuantity && !values.adjustmentReason.trim()) {
      reviewForm.setError('adjustmentReason', {
        message: 'Nhập lý do khi điều chỉnh lượng đề xuất.',
      })
      return
    }
    try {
      await acceptMutation.mutateAsync({
        id: selected.id,
        request: {
          ...values,
          expectedVersion: selected.version,
          expectedInboundRequestVersion: selected.inboundRequestVersion,
          expectedSnapshot: selected.expectedSnapshot,
        },
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.inboundRequests.all })
      toast.success(
        'Đã kiểm tra nháp bổ sung. Mở yêu cầu nhập để hoàn thiện ngày nhập và gửi duyệt.'
      )
      setReviewId('')
    } catch (error) {
      reportError(error, 'Không thể chấp nhận nháp bổ sung.')
      await runQuery.refetch()
    }
  })
  async function reject(item: ReplenishmentSuggestion) {
    try {
      await rejectMutation.mutateAsync({
        id: item.id,
        suggestionType: 'Replenishment',
        expectedVersion: item.version,
        expectedInboundRequestVersion: item.inboundRequestVersion,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.inboundRequests.all })
      toast.success(
        'Đã từ chối đề xuất. Nháp chưa chỉnh sửa được hủy; nháp đã chỉnh sửa bị chặn gửi.'
      )
      setReviewId('')
    } catch (error) {
      reportError(error, 'Không thể từ chối đề xuất.')
      await runQuery.refetch()
    }
  }
  async function evaluate() {
    if (!runId) return
    try {
      await evaluateMutation.mutateAsync(runId)
      toast.success('Đã đối chiếu nhu cầu xuất của các ngày đã kết thúc.')
    } catch (error) {
      reportError(error, 'Không thể đối chiếu dự báo.')
    }
  }
  async function acceptTransfer() {
    if (!transferSuggestion || !destinationSlotId) return
    try {
      await transferMutation.mutateAsync({
        id: transferSuggestion.id,
        request: { destinationSlotId, adjustedQuantity: null },
      })
      toast.success('Đã tạo yêu cầu điều chuyển theo quy trình kho hiện hành.')
      setTransferSuggestion(null)
    } catch (error) {
      reportError(error, 'Không thể chấp nhận đề xuất điều chuyển.')
    }
  }
  async function rejectTransfer(id: string) {
    try {
      await rejectMutation.mutateAsync({ id, suggestionType: 'Rebalancing' })
      toast.success('Đã từ chối đề xuất điều chuyển.')
    } catch (error) {
      reportError(error, 'Không thể từ chối đề xuất điều chuyển.')
    }
  }
  return {
    createForm,
    reviewForm,
    warehouseId,
    changeWarehouse,
    runId,
    selectRun,
    runQuery,
    runsQuery,
    createAndRun,
    isCreating: createMutation.isPending || executeMutation.isPending,
    selected,
    openReview,
    closeReview: () => setReviewId(''),
    suppliersQuery,
    accept,
    reject,
    isReviewing: acceptMutation.isPending || rejectMutation.isPending,
    productId,
    setProductId,
    overview: {
      rows: filteredOverview.slice(
        (overviewPage - 1) * overviewPageSize,
        overviewPage * overviewPageSize
      ),
      totalCount: filteredOverview.length,
      riskCounts: overviewRiskCounts,
      search: overviewSearch,
      risk: overviewRisk,
      page: overviewPage,
      pageSize: overviewPageSize,
      onSearchChange: (search: string) => {
        setOverviewSearch(search)
        setOverviewPage(1)
      },
      onRiskChange: (risk: ForecastRiskFilter) => {
        setOverviewRisk(risk)
        setOverviewPage(1)
      },
      onPageChange: setOverviewPage,
      onPageSizeChange: (pageSize: number) => {
        setOverviewPageSize(pageSize)
        setOverviewPage(1)
      },
      onExport: exportOverview,
    },
    evaluate,
    isEvaluating: evaluateMutation.isPending,
    transferSuggestion,
    setTransferSuggestion,
    destinationSlotId,
    setDestinationSlotId,
    slotsQuery,
    acceptTransfer,
    rejectTransfer,
    isTransferring: transferMutation.isPending,
  }
}

export type ForecastWorkspace = ReturnType<typeof useForecastWorkspace>
