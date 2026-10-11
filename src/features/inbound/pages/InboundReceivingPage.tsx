'use client'
import { getRemainingReceiptQuantity } from '../utils/receipt-units'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  formatApiError,
  getApiErrorCode,
  getApiErrorMessage,
  isApiErrorResponse,
} from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { APP_ROUTES } from '@/routes/app-routes'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { InboundPageHeader } from '../components/InboundWorkspace'
import {
  InboundDocumentImportDialog,
  ReceiveGoodsDialog,
  ReceivingTaskDirectory,
  ReceivingTaskStatsCards,
  type ReceivingAssignmentFilter,
} from '../components/ReceivingPage'
import { AssignWarehouseTaskDialog } from '../components/TaskAssignment'
import { useAssignWarehouseTask } from '../hooks/use-assign-warehouse-task'
import { useWarehouseTaskAssignmentAccess } from '../hooks/use-warehouse-task-assignment-access'
import {
  useCreateDraftFromDocumentMutation,
  useCreateGoodsReceiptMutation,
  useNextGoodsReceiptCodeQuery,
  useInboundDocumentImportQuery,
  useReceivingTasksQuery,
  useReviewInboundDocumentImportMutation,
  useStartInboundDocumentImportMutation,
  useSubmitGoodsReceiptMutation,
} from '../hooks/use-inbound'
import {
  inboundDocumentFileSchema,
  inboundDocumentReviewSchema,
  type InboundDocumentReviewFormValues,
} from '../schemas/inbound-document-import.schema'
import { goodsReceiptSchema, type GoodsReceiptFormValues } from '../schemas/inbound.schema'
import type { ReceivingTask, SaveGoodsReceiptRequest } from '../types/inbound.types'
import { inboundService } from '../services/inbound.service'
import {
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from '@/features/inbound-request/utils/inbound-request-format'

export default function InboundReceivingPage() {
  const meQuery = useMeQuery()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUserId, canAssign } = useWarehouseTaskAssignmentAccess()
  const [searchText, setSearchText] = useState(() => searchParams.get('search') ?? '')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<ReceivingAssignmentFilter>('all')
  const assignment = useAssignWarehouseTask()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedTask, setSelectedTask] = useState<ReceivingTask | null>(null)
  const [importTask, setImportTask] = useState<ReceivingTask | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importId, setImportId] = useState('')
  const [draftReceiptId, setDraftReceiptId] = useState<string | null>(null)
  const [isDiscardImportOpen, setIsDiscardImportOpen] = useState(false)
  const initializedImportIdRef = useRef('')
  const codeInstanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const codeSessionKey = `${codeInstanceId}:${codeSession}`
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const query = useReceivingTasksQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(createdFrom ? { createdFrom: toOperationalDateTimeStart(createdFrom) } : {}),
    ...(createdTo ? { createdTo: toOperationalDateTimeEnd(createdTo) } : {}),
    ...(canAssign && assignmentFilter === 'unassigned' ? { unassigned: true } : {}),
  })
  const createMutation = useCreateGoodsReceiptMutation()
  const submitMutation = useSubmitGoodsReceiptMutation()
  const importQuery = useInboundDocumentImportQuery(importId)
  const startImportMutation = useStartInboundDocumentImportMutation()
  const reviewImportMutation = useReviewInboundDocumentImportMutation()
  const createDraftMutation = useCreateDraftFromDocumentMutation()
  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: { inboundRequestId: '', receiptCode: '', lines: [] },
  })
  const nextCodeQuery = useNextGoodsReceiptCodeQuery(Boolean(selectedTask), codeSessionKey)
  const codeSuggestion = useCodeSuggestion({
    active: Boolean(selectedTask),
    sessionKey: codeSessionKey,
    suggestedCode: nextCodeQuery.data,
    isFetching: nextCodeQuery.isFetching,
    isError: nextCodeQuery.isError,
    getCurrentCode: () => form.getValues('receiptCode'),
    applyCode: (code) =>
      form.setValue('receiptCode', code, { shouldValidate: form.formState.isSubmitted }),
  })
  const importForm = useForm<InboundDocumentReviewFormValues>({
    resolver: zodResolver(inboundDocumentReviewSchema),
    defaultValues: { inboundRequestId: '', acknowledgeWarehouseMismatch: false, lines: [] },
  })

  useEffect(() => {
    const review = importQuery.data?.review
    if (!review?.inboundRequestId || !importId || initializedImportIdRef.current === importId)
      return

    initializedImportIdRef.current = importId
    importForm.reset({
      inboundRequestId: review.inboundRequestId,
      acknowledgeWarehouseMismatch: review.warehouseMismatchAcknowledged,
      lines: review.lines.map((line) => ({
        sourceLineNumber: line.sourceLineNumber,
        inboundRequestItemId: line.inboundRequestItemId ?? '',
        confirmedQuantity: line.confirmedQuantity,
        damagedQuantity: line.damagedQuantity,
        exceptionReason: line.exceptionReason ?? '',
        isLotTracked: line.isLotTracked,
        lotNumber: line.lotNumber ?? '',
        manufacturedDate: line.manufacturedDate ?? '',
        expiryDate: line.expiryDate ?? '',
      })),
    })
  }, [importId, importQuery.data?.review, importForm])

  function openReceive(task: ReceivingTask) {
    if (task.activeGoodsReceiptId) {
      router.push(APP_ROUTES.goodsReceiptDetail(task.activeGoodsReceiptId) as Route)
      return
    }
    setSelectedTask(task)
    codeSuggestion.resetSession()
    setCodeSession((value) => value + 1)
    form.reset({
      inboundRequestId: task.inboundRequestId,
      receiptCode: '',
      lines: task.lines
        .filter((line) => line.remainingQuantity > 0)
        .map((line) => ({
          inboundRequestItemId: line.inboundRequestItemId,
          enteredUnitId: getRemainingReceiptQuantity(line, line.enteredUnitId).unitId,
          receivedQty: getRemainingReceiptQuantity(line, line.enteredUnitId).quantity,
          damagedQty: 0,
          exceptionReason: '',
          isLotTracked: line.isLotTracked,
          lotNumber: '',
          manufacturedDate: '',
          expiryDate: '',
        })),
    })
  }

  function resetImport() {
    setImportTask(null)
    setImportFile(null)
    setImportId('')
    initializedImportIdRef.current = ''
    setDraftReceiptId(null)
    importForm.reset({ inboundRequestId: '', acknowledgeWarehouseMismatch: false, lines: [] })
    importForm.clearErrors()
  }

  function openDocumentImport(task: ReceivingTask) {
    resetImport()
    setImportTask(task)
    if (task.activeDocumentImportId) setImportId(task.activeDocumentImportId)
  }

  function selectImportFile(file: File | null) {
    setImportFile(file)
    importForm.clearErrors('root')
    if (!file) return

    const result = inboundDocumentFileSchema.safeParse(file)
    if (!result.success) {
      importForm.setError('root', { message: result.error.issues[0]?.message })
    }
  }

  async function analyzeDocument() {
    if (!importTask || !importFile) {
      importForm.setError('root', { message: 'Vui lòng chọn chứng từ cần phân tích.' })
      return
    }

    const result = inboundDocumentFileSchema.safeParse(importFile)
    if (!result.success) {
      importForm.setError('root', { message: result.error.issues[0]?.message })
      return
    }

    try {
      const response = await startImportMutation.mutateAsync({
        file: importFile,
        inboundRequestId: importTask.inboundRequestId,
        warehouseId: importTask.warehouseId,
      })
      setImportId(response.data)
    } catch (error) {
      logger.error(error)
      toast.error('Không thể phân tích chứng từ. Bạn vẫn có thể nhập hàng thủ công.')
    }
  }

  async function saveDocumentReview(values: InboundDocumentReviewFormValues) {
    if (!importId) return

    try {
      const normalizedValues = {
        inboundRequestId: values.inboundRequestId,
        acknowledgeWarehouseMismatch: values.acknowledgeWarehouseMismatch,
        lines: values.lines.map((line) => ({
          sourceLineNumber: line.sourceLineNumber,
          inboundRequestItemId: line.inboundRequestItemId,
          confirmedQuantity: line.confirmedQuantity,
          damagedQuantity: line.damagedQuantity,
          exceptionReason: line.exceptionReason.trim(),
          isLotTracked: line.isLotTracked,
          lotNumber: line.isLotTracked ? line.lotNumber.trim() : '',
          manufacturedDate: line.isLotTracked ? line.manufacturedDate : '',
          expiryDate: line.isLotTracked ? line.expiryDate : '',
        })),
      }
      await reviewImportMutation.mutateAsync({
        id: importId,
        inboundRequestId: normalizedValues.inboundRequestId,
        acknowledgeWarehouseMismatch: normalizedValues.acknowledgeWarehouseMismatch,
        lines: normalizedValues.lines.map((line) => ({
          sourceLineNumber: line.sourceLineNumber,
          inboundRequestItemId: line.inboundRequestItemId,
          confirmedQuantity: line.confirmedQuantity,
          damagedQuantity: line.damagedQuantity,
          exceptionReason: line.exceptionReason || null,
          lotNumber: line.isLotTracked ? line.lotNumber || null : null,
          manufacturedDate: line.isLotTracked ? line.manufacturedDate || null : null,
          expiryDate: line.isLotTracked ? line.expiryDate || null : null,
        })),
      })
      importForm.reset(normalizedValues)
      toast.success('Đã lưu điều chỉnh và kiểm tra lại chứng từ.')
    } catch (error) {
      logger.error(error)
      toast.error('Không thể lưu phần đối chiếu. Vui lòng kiểm tra dữ liệu và thử lại.')
    }
  }

  async function createDraftFromDocument() {
    if (!importId) return

    try {
      const response = await createDraftMutation.mutateAsync(importId)
      setDraftReceiptId(response.data)
      toast.success('Đã tạo phiếu nhận hàng nháp. Mở phiếu để gửi duyệt hoặc xác nhận hàng đến.')
    } catch (error) {
      logger.error(error)
      toast.error('Không thể tạo phiếu nhận hàng nháp. Vui lòng kiểm tra lại dữ liệu mới nhất.')
    }
  }

  async function save(values: GoodsReceiptFormValues, shouldSubmit: boolean) {
    try {
      const request: SaveGoodsReceiptRequest = {
        inboundRequestId: values.inboundRequestId,
        receiptCode: values.receiptCode,
        lines: values.lines.map((line) => ({
          inboundRequestItemId: line.inboundRequestItemId,
          receivedQty: line.receivedQty,
          enteredUnitId: line.enteredUnitId,
          damagedQty: line.damagedQty,
          exceptionReason: line.exceptionReason.trim() || null,
          lotNumber: line.isLotTracked ? line.lotNumber.trim() || null : null,
          manufacturedDate: line.isLotTracked ? line.manufacturedDate || null : null,
          expiryDate: line.isLotTracked ? line.expiryDate || null : null,
        })),
      }
      const response = await createMutation.mutateAsync(request)
      if (shouldSubmit) {
        try {
          const receipt = await inboundService.getReceipt(response.data)
          await submitMutation.mutateAsync({
            receiptId: response.data,
            expectedVersion: receipt.data.version,
          })
        } catch (error) {
          if (isApiErrorResponse(error)) logger.warn(formatApiError(error))
          else logger.error(error)
          toast.error(
            'Phiếu nhận hàng đã được lưu nháp nhưng chưa gửi duyệt. Bạn có thể thử lại từ trang chi tiết.'
          )
          setSelectedTask(null)
          form.reset()
          router.push(APP_ROUTES.goodsReceiptDetail(response.data) as Route)
          return
        }
      }
      toast.success(
        shouldSubmit
          ? 'Đã tạo và gửi phiếu nhận hàng để duyệt.'
          : 'Đã lưu bản nháp phiếu nhận hàng.'
      )
      setSelectedTask(null)
      form.reset()
    } catch (error) {
      if (isApiErrorResponse(error)) logger.warn(formatApiError(error))
      else logger.error(error)
      const message = getApiErrorMessage(
        error,
        'Không thể lưu phiếu nhận hàng. Kiểm tra số lượng và thử lại.'
      )
      if (getApiErrorCode(error) === 'GOODS_RECEIPT_CODE_CONFLICT') {
        form.setError('receiptCode', { type: 'server', message }, { shouldFocus: true })
      }
      toast.error(message)
    }
  }

  function openAssign(task: ReceivingTask) {
    assignment.open({
      kind: 'Receiving',
      id: task.inboundRequestId,
      referenceCode: task.inboundRequestCode,
      warehouseId: task.warehouseId,
      warehouseName: task.warehouseName,
      currentAssigneeId: task.assignedTo,
      currentAssigneeName: task.assignedToName,
      currentPriority: task.priority,
      currentDueAt: task.dueAt,
    })
  }

  const isPending = createMutation.isPending || submitMutation.isPending
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <InboundPageHeader
        title="Nhập kho"
        canViewRequests={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_VIEW) ?? false}
        canViewReceipts={meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW) ?? false}
      />
      <ReceivingTaskStatsCards
        taskStats={query.data?.taskStats ?? null}
        isLoading={query.isFetching}
        isError={query.isError}
      />
      <ReceivingTaskDirectory
        canViewRequest={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_VIEW) ?? false}
        items={query.data?.items ?? []}
        totalCount={query.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        createdFrom={createdFrom}
        createdTo={createdTo}
        isLoading={query.isFetching}
        isFetching={query.isFetching}
        isError={query.isError}
        onSearchChange={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        onCreatedFromChange={(value) => {
          setCreatedFrom(value)
          setPage(1)
        }}
        onCreatedToChange={(value) => {
          setCreatedTo(value)
          setPage(1)
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onReceive={openReceive}
        onImportDocument={openDocumentImport}
        onRetry={() => void query.refetch()}
        currentUserId={currentUserId}
        canAssign={canAssign}
        assignmentFilter={assignmentFilter}
        onAssignmentFilterChange={(value) => {
          setAssignmentFilter(value)
          setPage(1)
        }}
        onAssign={openAssign}
      />
      <AssignWarehouseTaskDialog
        target={assignment.target}
        form={assignment.form}
        staff={assignment.staff}
        isLoadingStaff={assignment.isLoadingStaff}
        isErrorStaff={assignment.isErrorStaff}
        isFetchingStaff={assignment.isFetchingStaff}
        onRetryStaff={assignment.onRetryStaff}
        isPending={assignment.isPending}
        onOpenChange={(open) => !open && assignment.close()}
        onSubmit={assignment.onSubmit}
        onUnassign={assignment.onUnassign}
      />
      <ReceiveGoodsDialog
        isLoadingCode={nextCodeQuery.isFetching}
        isCodeSuggestionError={nextCodeQuery.isError}
        onReceiptCodeChange={codeSuggestion.markEdited}
        task={selectedTask}
        form={form}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open && !isPending) setSelectedTask(null)
        }}
        onSaveDraft={() => void form.handleSubmit((values) => save(values, false))()}
        onSaveAndSubmit={() => void form.handleSubmit((values) => save(values, true))()}
      />
      <InboundDocumentImportDialog
        task={importTask}
        file={importFile}
        importData={importQuery.data ?? null}
        draftReceiptId={draftReceiptId ?? importQuery.data?.goodsReceiptId ?? null}
        form={importForm}
        isStarting={startImportMutation.isPending}
        isLoadingImport={Boolean(importId) && importQuery.isLoading}
        isSavingReview={reviewImportMutation.isPending}
        isCreatingDraft={createDraftMutation.isPending}
        onFileChange={selectImportFile}
        onAnalyze={() => void analyzeDocument()}
        onSaveReview={() => void importForm.handleSubmit(saveDocumentReview)()}
        onCreateDraft={() => void createDraftFromDocument()}
        onManualFallback={() => {
          if (!importTask) return
          const task = importTask
          resetImport()
          openReceive(task)
        }}
        onOpenChange={(open) => {
          if (
            !open &&
            !startImportMutation.isPending &&
            !reviewImportMutation.isPending &&
            !createDraftMutation.isPending
          ) {
            if (importForm.formState.isDirty) {
              setIsDiscardImportOpen(true)
              return
            }
            resetImport()
          }
        }}
      />
      <UnsavedChangesDialog
        open={isDiscardImportOpen}
        onOpenChange={setIsDiscardImportOpen}
        onDiscard={() => {
          resetImport()
          setIsDiscardImportOpen(false)
        }}
      />
    </div>
  )
}
