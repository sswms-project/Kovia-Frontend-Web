'use client'

import { useState } from 'react'
import type { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import type { SlotOption } from '../components/PutawayDetailPage'
import type { PutawayFormValues } from '../schemas/inbound.schema'
import { getPutawayAllocationState } from '../schemas/putaway-allocation.schema'
import type { GoodsReceiptDetail, PutAwaySuggestionsResponse } from '../types/inbound.types'
import { getSuggestedQuantities } from '../utils/putaway-plan-draft'
import { getPutawayRemainingInput } from '../utils/putaway-units'
import { usePutawayFormSuggestionsMutation } from './use-inbound'

interface UsePutawayFormSuggestionsOptions {
  readonly receipt: GoodsReceiptDetail | undefined
  readonly form: UseFormReturn<PutawayFormValues>
  readonly append: UseFieldArrayAppend<PutawayFormValues, 'lines'>
  readonly slots: readonly SlotOption[]
}

/** Gợi ý vị trí ngay trên form cất hàng và điền kết quả được chọn vào các dòng phân bổ. */
export function usePutawayFormSuggestions({
  receipt,
  form,
  append,
  slots,
}: UsePutawayFormSuggestionsOptions) {
  const [response, setResponse] = useState<PutAwaySuggestionsResponse | null>(null)
  const mutation = usePutawayFormSuggestionsMutation()

  // Chỉ giữ vị trí có trong danh sách chọn của form để "Dùng vị trí này" luôn điền được.
  const usableSlotIds = new Set(
    slots.filter((slot) => !slot.unavailableReason).map((slot) => slot.id)
  )
  const suggestions: PutAwaySuggestionsResponse | null = response && {
    ...response,
    items: response.items.map((entry) => ({
      ...entry,
      suggestions: entry.suggestions.filter((suggestion) => usableSlotIds.has(suggestion.slotId)),
    })),
  }

  async function suggest() {
    if (!receipt || mutation.isPending) return
    try {
      const result = await mutation.mutateAsync(receipt.id)
      setResponse(result.data)
      if (result.data.aiNotice) toast.info(result.data.aiNotice)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lấy gợi ý vị trí. Vui lòng thử lại.'))
    }
  }

  function apply(itemId: string, slotId: string) {
    const item = receipt?.items.find((candidate) => candidate.id === itemId)
    if (!receipt || !item) return
    const lines = form.getValues('lines')
    if (lines.some((line) => line.goodsReceiptItemId === itemId && line.slotId === slotId)) {
      toast.info('Vị trí này đã có trong phân bổ của sản phẩm.')
      return
    }
    // Vị trí có số lượng đề xuất thì chỉ điền phần đó để phần còn lại sang vị trí khác.
    const suggested =
      suggestions?.items
        .find((entry) => entry.goodsReceiptItemId === itemId)
        ?.suggestions.find((suggestion) => suggestion.slotId === slotId)?.suggestedQuantity ?? 0
    const options = { shouldDirty: true, shouldValidate: true }
    const emptyIndex = lines.findIndex((line) => line.goodsReceiptItemId === itemId && !line.slotId)
    if (emptyIndex >= 0) {
      const input = suggested > 0 ? getPutawayRemainingInput(item, suggested) : null
      if (input) {
        form.setValue(`lines.${emptyIndex}.enteredUnitId`, input.enteredUnitId, options)
        form.setValue(`lines.${emptyIndex}.enteredQuantity`, input.enteredQuantity, options)
      }
      form.setValue(`lines.${emptyIndex}.slotId`, slotId, options)
      return
    }
    const assigned =
      getPutawayAllocationState(lines, receipt.items, slots).assignedByItem.get(itemId) ?? 0
    const unassigned = Math.max(0, Math.round(item.remainingPutAwayQuantity * 100) - assigned) / 100
    if (unassigned <= 0) {
      toast.info('Dòng hàng này đã được phân bổ đủ số lượng.')
      return
    }
    const quantity = suggested > 0 ? Math.min(suggested, unassigned) : unassigned
    append({
      goodsReceiptItemId: itemId,
      slotId,
      ...(getPutawayRemainingInput(item, quantity) ?? {
        enteredQuantity: quantity,
        enteredUnitId: item.baseUnitId,
      }),
    })
  }

  function applyBest() {
    for (const entry of suggestions?.items ?? []) {
      const item = receipt?.items.find((candidate) => candidate.id === entry.goodsReceiptItemId)
      const hasEmptyLine = form
        .getValues('lines')
        .some((line) => line.goodsReceiptItemId === entry.goodsReceiptItemId && !line.slotId)
      if (!item || !hasEmptyLine) continue
      for (const { slotId } of getSuggestedQuantities(item, entry.suggestions))
        apply(entry.goodsReceiptItemId, slotId)
    }
  }

  return {
    suggestions,
    isSuggesting: mutation.isPending,
    onSuggest: () => void suggest(),
    onApply: apply,
    onApplyBest: applyBest,
    onClear: () => setResponse(null),
  }
}
