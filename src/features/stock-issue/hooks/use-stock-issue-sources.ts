import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isApiErrorResponse, logApiError } from '@/lib/api-error'
import { useImportNavigation } from '@/components/operations/use-import-navigation'
import { stockIssueService } from '../services/stock-issue.service'
import { refreshStockIssueAfterWrite } from './use-stock-issue-requests'
import {
  baseSourceQuantity,
  sourceFactor,
  stockIssueSourcesSchema,
  type StockIssueSourcesValues,
} from '../schemas/stock-issue-sources.schema'
import type {
  StockIssueManualSourceDraft,
  StockIssueRequestSummary,
} from '../types/stock-issue.types'

export type SourceSeed = {
  itemId: string
  inventoryStockId: string
  quantity: number
  sourcePath: string
}[]

export function useStockIssueSources(
  order: StockIssueRequestSummary,
  seed: SourceSeed,
  draft: StockIssueManualSourceDraft | null,
  onDraft: (value: StockIssueManualSourceDraft | null) => void
) {
  const [open, setOpen] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [editingVersion, setEditingVersion] = useState<string | null>(null)
  const intent = useRef<{ draft: StockIssueManualSourceDraft; commandId: string } | null>(null)
  const saving = useRef(false)
  const client = useQueryClient()
  const form = useForm<StockIssueSourcesValues>({
    resolver: zodResolver(stockIssueSourcesSchema(order)),
    defaultValues: { reason: '', allocations: [] },
  })
  const mutation = useMutation({
    mutationFn: ({
      draft: body,
      commandId,
    }: {
      draft: StockIssueManualSourceDraft
      commandId: string
    }) => stockIssueService.adjustSources(body, commandId),
    retry: false,
  })
  const navigation = useImportNavigation(
    Boolean(draft) || (open && form.formState.isDirty) || uncertain || mutation.isPending,
    mutation.isPending || uncertain,
    'Đang xác minh kết quả đổi nguồn. Hãy thử lại đúng thao tác trước khi rời trang.'
  )

  function begin() {
    setEditingVersion(order.version)
    const allocations =
      draft?.orderId === order.id && draft.version === order.version ? draft.allocations : seed
    form.reset({
      reason: draft?.allocationReason ?? '',
      allocations: order.items.flatMap((item) => {
        if (item.quantity <= item.pickedQuantity) return []
        const rows = allocations.filter((row) => row.itemId === item.id)
        return rows.length
          ? rows.map((row) => ({
              ...row,
              quantity: row.quantity / sourceFactor(item.conversionFactor),
              path:
                draft?.labels?.[row.inventoryStockId] ??
                seed.find(
                  (source) =>
                    source.itemId === item.id && source.inventoryStockId === row.inventoryStockId
                )?.sourcePath ??
                '',
            }))
          : [
              {
                itemId: item.id,
                inventoryStockId: '',
                quantity:
                  (item.quantity - item.pickedQuantity) / sourceFactor(item.conversionFactor),
                path: '',
              },
            ]
      }),
    })
    setOpen(true)
  }
  function close() {
    if (saving.current || uncertain) return
    if (form.formState.isDirty) {
      setDiscardOpen(true)
      return
    }
    finishClose()
  }
  function finishClose() {
    setDiscardOpen(false)
    setOpen(false)
    form.reset()
  }
  async function save(values: StockIssueSourcesValues) {
    if (saving.current) return
    if (uncertain && intent.current) {
      await persist(intent.current)
      return
    }
    if (!order.version) return
    if (order.version !== editingVersion) {
      toast.warning('Phiếu đã thay đổi. Đóng phương án cũ rồi tải lại nguồn trước khi tiếp tục.')
      return
    }
    const body: StockIssueManualSourceDraft = {
      orderId: order.id,
      version: order.version,
      allocationReason: values.reason,
      labels: Object.fromEntries(values.allocations.map((row) => [row.inventoryStockId, row.path])),
      allocations: values.allocations.map((row) => ({
        itemId: row.itemId,
        inventoryStockId: row.inventoryStockId,
        quantity: baseSourceQuantity(
          row.quantity,
          order.items.find((item) => item.id === row.itemId)!.conversionFactor
        ),
      })),
    }
    if (order.status === 'Pending') {
      onDraft(body)
      form.reset(values)
      setOpen(false)
      toast.info('Đã chọn phương án. Hàng chỉ được giữ khi giao việc lấy hàng thành công.')
      return
    }
    intent.current = { draft: body, commandId: crypto.randomUUID() }
    await persist(intent.current)
  }
  async function persist(frozen: { draft: StockIssueManualSourceDraft; commandId: string }) {
    saving.current = true
    try {
      await mutation.mutateAsync(frozen)
    } catch (error) {
      const unknown =
        !isApiErrorResponse(error) || error.statusCode >= 500 || error.statusCode === 408
      setUncertain(unknown)
      logApiError(error)
      toast.warning(getApiErrorMessage(error, 'Chưa xác định được kết quả đổi nguồn.'), {
        description: unknown
          ? 'Bấm Thử lại để xác minh đúng thao tác; không gửi phương án mới.'
          : 'Chưa áp dụng phương án này. Tải lại phiếu và chọn nguồn còn khả dụng.',
      })
      return
    } finally {
      saving.current = false
    }
    setUncertain(false)
    intent.current = null
    form.reset()
    setOpen(false)
    onDraft(null)
    toast.success('Đã đổi nguồn chưa lấy. Phần đã lấy được giữ nguyên.')
    await refreshStockIssueAfterWrite(client, frozen.draft.orderId, true)
    void client.invalidateQueries({ queryKey: ['cross-dock'] })
    void client.invalidateQueries({ queryKey: ['stock-issue-sources'] })
  }
  return {
    open,
    begin,
    close,
    save,
    form,
    navigation,
    uncertain,
    busy: mutation.isPending,
    stale: open && editingVersion !== order.version,
    discardOpen,
    setDiscardOpen,
    finishClose,
    retry: () => {
      if (intent.current) void save(form.getValues())
    },
  }
}
