'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWarehouseLayoutQuery } from '@/features/warehouse/hooks/use-warehouse'
import { getApiErrorMessage } from '@/lib/api-error'
import { getPutawaySlotOptions } from '../utils/putaway-slot-options'
import {
  buildPlanDrafts,
  getPlannableItems,
  getSuggestedQuantities,
  getUnplannedQuantity,
  toSavePlanRequest,
  validatePlanDrafts,
  type PlanDraftLine,
  type PlanDrafts,
} from '../utils/putaway-plan-draft'
import type { GoodsReceiptDetail, PutAwaySuggestionsResponse } from '../types/inbound.types'
import {
  usePutawayHeldSlotsQuery,
  usePutawaySuggestionsMutation,
  useSavePutawayPlanMutation,
} from './use-inbound'

type LinePatch = Partial<Pick<PlanDraftLine, 'slotId' | 'quantity'>>

/** Điều phối việc quản lý cấu hình vị trí cất: bản nháp, gợi ý AI và lưu. */
export function usePutawayPlanEditor(receipt: GoodsReceiptDetail | undefined) {
  const [isOpen, setIsOpen] = useState(false)
  const [drafts, setDrafts] = useState<PlanDrafts>({})
  const [suggestions, setSuggestions] = useState<PutAwaySuggestionsResponse | null>(null)
  const layoutQuery = useWarehouseLayoutQuery(receipt?.warehouseId ?? '', isOpen)
  const heldSlotsQuery = usePutawayHeldSlotsQuery(receipt?.id ?? '', isOpen)
  const saveMutation = useSavePutawayPlanMutation()
  const suggestMutation = usePutawaySuggestionsMutation()
  const slots = useMemo(() => getPutawaySlotOptions(layoutQuery.data ?? []), [layoutQuery.data])
  const items = useMemo(() => receipt?.items ?? [], [receipt])
  const validation = useMemo(() => validatePlanDrafts(items, drafts, slots), [items, drafts, slots])

  function open() {
    if (!receipt) return
    setDrafts(buildPlanDrafts(receipt.items))
    setSuggestions(null)
    setIsOpen(true)
  }

  function setItemLines(
    itemId: string,
    update: (lines: readonly PlanDraftLine[]) => PlanDraftLine[]
  ) {
    setDrafts((current) => ({ ...current, [itemId]: update(current[itemId] ?? []) }))
  }

  function unplannedOf(itemId: string, lines: readonly PlanDraftLine[]) {
    const item = items.find((candidate) => candidate.id === itemId)
    return item ? getUnplannedQuantity(item, lines) : 0
  }

  function addLine(itemId: string, slotId = '') {
    setItemLines(itemId, (lines) => [
      ...lines,
      { key: crypto.randomUUID(), slotId, quantity: unplannedOf(itemId, lines) },
    ])
  }

  function updateLine(itemId: string, key: string, patch: LinePatch) {
    setItemLines(itemId, (lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  function removeLine(itemId: string, key: string) {
    setItemLines(itemId, (lines) => lines.filter((line) => line.key !== key))
  }

  function fillRemaining(itemId: string, key: string) {
    setItemLines(itemId, (lines) => {
      const extra = unplannedOf(itemId, lines)
      return lines.map((line) =>
        line.key === key
          ? { ...line, quantity: Math.round(((Number(line.quantity) || 0) + extra) * 100) / 100 }
          : line
      )
    })
  }

  async function suggest() {
    if (!receipt || suggestMutation.isPending) return
    try {
      const response = await suggestMutation.mutateAsync(receipt.id)
      setSuggestions(response.data)
      if (response.data.aiNotice) toast.info(response.data.aiNotice)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lấy gợi ý vị trí. Vui lòng thử lại.'))
    }
  }

  function applySuggestion(itemId: string, slotId: string) {
    const lines = drafts[itemId] ?? []
    const unplanned = unplannedOf(itemId, lines)
    const existing = lines.find((line) => line.slotId === slotId)
    if (unplanned <= 0 && !existing) {
      toast.info('Dòng hàng này đã được cấu hình đủ số lượng.')
      return
    }
    const suggested = suggestions?.items
      .find((entry) => entry.goodsReceiptItemId === itemId)
      ?.suggestions.find((suggestion) => suggestion.slotId === slotId)?.suggestedQuantity
    // Vị trí có số lượng đề xuất thì chỉ điền phần đó để phần còn lại sang vị trí khác.
    const extra = suggested && !existing ? Math.min(suggested, unplanned) : unplanned
    setItemLines(itemId, (current) =>
      existing
        ? current.map((line) =>
            line.key === existing.key
              ? {
                  ...line,
                  quantity: Math.round(((Number(line.quantity) || 0) + extra) * 100) / 100,
                }
              : line
          )
        : [...current, { key: crypto.randomUUID(), slotId, quantity: extra }]
    )
  }

  function applyBestSuggestions() {
    setDrafts((current) => {
      const next = { ...current }
      for (const entry of suggestions?.items ?? []) {
        const item = items.find((candidate) => candidate.id === entry.goodsReceiptItemId)
        if (!item || (current[item.id] ?? []).length > 0) continue
        next[item.id] = getSuggestedQuantities(item, entry.suggestions).map((line) => ({
          key: crypto.randomUUID(),
          ...line,
        }))
      }
      return next
    })
  }

  async function save() {
    if (!receipt || !validation.canSave || saveMutation.isPending) return
    try {
      await saveMutation.mutateAsync({
        receiptId: receipt.id,
        request: toSavePlanRequest(receipt.items, drafts, receipt.version),
      })
      toast.success('Đã lưu vị trí cất hàng. Nhân viên được giao sẽ thấy kế hoạch này.')
      setIsOpen(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Không thể lưu cấu hình. Dữ liệu có thể đã thay đổi, vui lòng tải lại.'
        )
      )
    }
  }

  return {
    isOpen,
    plannableItems: getPlannableItems(items),
    drafts,
    slots,
    validation,
    suggestions,
    heldSlots: heldSlotsQuery.data,
    isLoadingSlots: layoutQuery.isLoading,
    isSlotsError: layoutQuery.isError,
    isSuggesting: suggestMutation.isPending,
    isSaving: saveMutation.isPending,
    open,
    close: () => setIsOpen(false),
    addLine,
    updateLine,
    removeLine,
    fillRemaining,
    suggest,
    applySuggestion,
    applyBestSuggestions,
    save,
    retrySlots: () => void layoutQuery.refetch(),
  }
}
