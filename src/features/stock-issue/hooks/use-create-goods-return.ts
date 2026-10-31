import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useWarehouseLocationsQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { useSaveReturnDocument } from '@/hooks/use-return-document-editing'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { stockIssueService } from '../services/stock-issue.service'
import {
  createGoodsReturnRequestSchema,
  type CreateGoodsReturnRequestFormValues,
} from '../schemas/stock-issue.schema'
import type {
  GoodsReturnLineSuggestion,
  GoodsReturnSuggestionLineRequest,
  GoodsReturnRequestSummary,
} from '../types/stock-issue.types'
import {
  useCreateGoodsReturnRequestMutation,
  useGoodsReturnSlotSuggestionsQuery,
  useStockIssueRequestQuery,
} from './use-stock-issue-requests'

/**
 * Tạo yêu cầu trả hàng ngay trong màn Trả hàng: chọn phiếu xuất đã xuất kho, rồi nhập số lượng trả
 * theo từng dòng đã lấy. Vị trí nhập lại do backend gợi ý theo quy tắc kho (vị trí lấy hàng cũ nếu còn
 * chỗ, hàng lỗi vào vị trí cách biệt); người dùng vẫn chọn tay được nhưng backend sẽ chặn vị trí không nhận.
 */
export function useCreateGoodsReturn() {
  const [editingDocument, setEditingDocument] = useState<GoodsReturnRequestSummary | null>(null)
  const [codeSession, setCodeSession] = useState(0)
  const hydratedSource = useRef<string | null>(null)
  const saveMutation = useSaveReturnDocument('goodsReturnRequests')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [slotSearch, setSlotSearch] = useState('')
  const debouncedSlotSearch = useDebouncedValue(slotSearch, 350)
  // Vị trí hệ thống đã tự điền cho từng dòng, để đổi gợi ý khi người dùng đổi số lượng hoặc tình trạng
  // mà không ghi đè vị trí họ tự chọn.
  const autoSlots = useRef<Record<string, string>>({})

  const sourceQuery = useStockIssueRequestQuery(sourceId)
  const order = sourceQuery.data ?? null
  const createMutation = useCreateGoodsReturnRequestMutation()
  const form = useForm<CreateGoodsReturnRequestFormValues>({
    resolver: zodResolver(createGoodsReturnRequestSchema),
    defaultValues: { goodsReturnRequestCode: '', reason: '', lines: [] },
  })
  const nextCode = useQuery({
    queryKey: [...queryKeys.goodsReturnRequests.all, 'next-code', codeSession],
    queryFn: () => stockIssueService.getNextGoodsReturnCode().then((response) => response.data),
    enabled: Boolean(sourceId) && !editingDocument,
    staleTime: 0,
  })
  const slotsQuery = useWarehouseLocationsQuery(order?.warehouseId ?? '', {
    top: 200,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
    ...(debouncedSlotSearch.trim() ? { searchText: debouncedSlotSearch.trim() } : {}),
  })

  const watchedLines = useWatch({ control: form.control, name: 'lines' })
  const suggestionItems = useDebouncedValue(
    useMemo<GoodsReturnSuggestionLineRequest[]>(
      () =>
        (watchedLines ?? []).map((line) => ({
          stockIssuePickDetailId: line.stockIssuePickDetailId,
          // Chưa nhập số lượng thì gợi ý theo toàn bộ số có thể trả để vị trí được điền sẵn ngay.
          quantity: line.quantity > 0 ? line.quantity : line.returnableQuantity,
          condition: line.condition,
        })),
      [watchedLines]
    ),
    350
  )
  const suggestionsQuery = useGoodsReturnSlotSuggestionsQuery(
    order?.id ?? null,
    suggestionItems.filter((item) => item.quantity > 0)
  )
  const suggestionsByPickDetail = useMemo(
    () =>
      Object.fromEntries(
        (suggestionsQuery.data ?? []).map((line) => [line.stockIssuePickDetailId, line])
      ) as Readonly<Record<string, GoodsReturnLineSuggestion>>,
    [suggestionsQuery.data]
  )

  useEffect(() => {
    if (!order || hydratedSource.current === `${order.id}:${editingDocument?.id ?? 'new'}`) return
    hydratedSource.current = `${order.id}:${editingDocument?.id ?? 'new'}`
    autoSlots.current = {}
    const savedLines = new Map(
      (editingDocument?.items ?? []).map((line) => [line.stockIssuePickDetailId, line])
    )
    const lines = order.items.flatMap((item) =>
      item.pickDetails
        .filter(
          (detail) =>
            detail.issuedAt && (detail.returnableQuantity > 0 || savedLines.has(detail.id))
        )
        .map((detail) => {
          const saved = savedLines.get(detail.id)
          return {
            stockIssuePickDetailId: detail.id,
            productName: item.productName,
            lotNumber: detail.lotNumber,
            returnableQuantity: detail.returnableQuantity,
            quantity: saved?.quantity ?? 0,
            condition: saved?.condition ?? ('Good' as const),
            restockSlotId: saved?.restockSlotId ?? '',
          }
        })
    )
    // Keep unavailable saved lines visible and invalid until the user explicitly reduces/removes them.
    for (const saved of editingDocument?.items ?? []) {
      if (
        saved.stockIssuePickDetailId &&
        !lines.some((line) => line.stockIssuePickDetailId === saved.stockIssuePickDetailId)
      )
        lines.push({
          stockIssuePickDetailId: saved.stockIssuePickDetailId,
          productName: saved.productName,
          lotNumber: saved.lotNumber,
          returnableQuantity: 0,
          quantity: saved.quantity,
          condition: saved.condition,
          restockSlotId: saved.restockSlotId ?? '',
        })
    }
    form.reset({
      goodsReturnRequestCode:
        editingDocument?.goodsReturnRequestCode ?? form.getValues('goodsReturnRequestCode') ?? '',
      reason: editingDocument?.reason ?? '',
      lines,
    })
  }, [form, order, editingDocument])

  const codeSuggestion = useCodeSuggestion({
    active: Boolean(order) && !editingDocument,
    sessionKey: String(codeSession),
    suggestedCode: nextCode.data,
    isFetching: nextCode.isFetching,
    isError: nextCode.isError,
    getCurrentCode: () => form.getValues('goodsReturnRequestCode') ?? '',
    applyCode: (code) => form.setValue('goodsReturnRequestCode', code),
  })

  // Điền vị trí gợi ý đầu tiên cho dòng chưa chọn hoặc dòng đang giữ vị trí do hệ thống điền.
  useEffect(() => {
    form.getValues('lines').forEach((line, index) => {
      const suggestion = suggestionsByPickDetail[line.stockIssuePickDetailId]
      if (!suggestion || suggestion.condition !== line.condition) return
      const autoSlot = autoSlots.current[line.stockIssuePickDetailId]
      if (line.restockSlotId && line.restockSlotId !== autoSlot) return
      const next = line.condition === 'Scrap' ? '' : (suggestion.suggestions[0]?.slotId ?? '')
      if (next === line.restockSlotId) return
      form.setValue(`lines.${index}.restockSlotId`, next)
      autoSlots.current[line.stockIssuePickDetailId] = next
    })
  }, [form, suggestionsByPickDetail])

  function closeForm() {
    if (createMutation.isPending || saveMutation.isPending) return
    setEditingDocument(null)
    hydratedSource.current = null
    setSourceId(null)
    setSlotSearch('')
    autoSlots.current = {}
    setCodeSession((value) => value + 1)
    form.reset({ goodsReturnRequestCode: '', reason: '', lines: [] })
  }

  async function submit(values: CreateGoodsReturnRequestFormValues) {
    if (!order) return
    try {
      const request = {
        reason: values.reason,
        items: values.lines
          .filter((line) => line.quantity > 0)
          .map((line) => ({
            stockIssuePickDetailId: line.stockIssuePickDetailId,
            quantity: line.quantity,
            condition: line.condition,
            restockSlotId: line.condition === 'Scrap' ? null : line.restockSlotId,
          })),
      }
      if (editingDocument) {
        if (!editingDocument.version) throw new Error('Thiếu phiên bản phiếu. Vui lòng tải lại.')
        await saveMutation.mutateAsync({
          id: editingDocument.id,
          expectedVersion: editingDocument.version,
          commandId: crypto.randomUUID(),
          content: { ...request, stockIssueRequestId: order.id },
        })
        toast.success('Đã lưu nháp. Bạn có thể kiểm tra rồi gửi duyệt lại.')
      } else {
        await createMutation.mutateAsync({
          stockIssueRequestId: order.id,
          request: {
            ...request,
            goodsReturnRequestCode: values.goodsReturnRequestCode,
          },
        })
        toast.success('Đã tạo yêu cầu trả hàng.')
      }
      closeForm()
    } catch (error) {
      logger.error(formatApiError(error))
      const message = getApiErrorMessage(error, 'Không thể tạo yêu cầu trả hàng.')
      if (!editingDocument && message.startsWith('Mã '))
        form.setError('goodsReturnRequestCode', { type: 'server', message })
      toast.error(message)
    }
  }

  return {
    picker: {
      open: isPickerOpen,
      onOpenChange: setIsPickerOpen,
      onSelect: (stockIssueRequestId: string) => {
        setIsPickerOpen(false)
        setSourceId(stockIssueRequestId)
      },
    },
    openPicker: () => setIsPickerOpen(true),
    openForEdit: (document: GoodsReturnRequestSummary) => {
      if (!document.allowedActions?.includes('Update') || !document.version) return
      if (document.items.some((line) => !line.stockIssuePickDetailId)) {
        toast.error(
          'Phiếu cũ thiếu dòng xuất nguồn. Cần đối chiếu trước khi chỉnh sửa để tránh mất dòng hàng.'
        )
        return
      }
      hydratedSource.current = null
      setEditingDocument(document)
      setSourceId(document.stockIssueRequestId)
    },
    dialog: {
      codeSuggestionStatus: nextCode.isFetching
        ? ('loading' as const)
        : nextCode.isError
          ? ('error' as const)
          : ('ready' as const),
      onCodeChange: () => {
        codeSuggestion.markEdited()
        form.clearErrors('goodsReturnRequestCode')
      },
      isEditing: Boolean(editingDocument),
      order,
      form,
      isPending: createMutation.isPending || saveMutation.isPending,
      slotOptions: (slotsQuery.data?.items ?? []).map((slot) => ({
        id: slot.id,
        label: slot.code,
      })),
      suggestionsByPickDetail,
      allowableByPickDetail: Object.fromEntries(
        (order?.items ?? []).flatMap((item) =>
          item.pickDetails.map((detail) => [detail.id, Math.max(0, detail.returnableQuantity)])
        )
      ) as Readonly<Record<string, number>>,
      slotSearch,
      onSlotSearchChange: setSlotSearch,
      onOpenChange: (open: boolean) => {
        if (!open) closeForm()
      },
      onSubmit: submit,
    },
  }
}
