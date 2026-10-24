'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inboundService } from '../services/inbound.service'
import type { UseFieldArrayAppend, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
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
  readonly autoFill?: boolean
}

/** Gợi ý vị trí ngay trên form cất hàng và điền kết quả được chọn vào các dòng phân bổ. */
export function usePutawayFormSuggestions({
  receipt,
  form,
  append,
  slots,
  autoFill = false,
}: UsePutawayFormSuggestionsOptions) {
  const [response, setResponse] = useState<PutAwaySuggestionsResponse | null>()
  const mutation = usePutawayFormSuggestionsMutation()
  const filled = useRef('')
  const automatic = useQuery({
    queryKey: ['goods-receipts', 'auto-plan-suggestions', receipt?.id, receipt?.version],
    queryFn: () => inboundService.suggestPutawaySlots(receipt!.id).then((result) => result.data),
    enabled:
      autoFill &&
      !!receipt &&
      slots.length > 0 &&
      !receipt.items.some((item) => (item.putAwayPlan?.length ?? 0) > 0) &&
      !form.getValues('lines').some((line) => line.slotId) &&
      !form.getFieldState('lines').isDirty,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!automatic.error) return
    const message = getApiErrorMessage(
      automatic.error,
      'Không thể tự điền vị trí. Bạn có thể chọn thủ công hoặc thử gợi ý lại.'
    )
    logger.warn(message)
    toast.error(message)
  }, [automatic.error])

  useEffect(() => {
    const key = `${receipt?.id}:${receipt?.version}`
    if (
      !autoFill ||
      !receipt ||
      !automatic.data ||
      automatic.isFetching ||
      filled.current === key ||
      form.getFieldState('lines').isDirty
    )
      return
    if (form.getValues('lines').some((line) => line.slotId)) return
    filled.current = key
    const usable = new Set(slots.filter((slot) => !slot.unavailableReason).map((slot) => slot.id))
    const next = receipt.items
      .filter((item) => item.remainingPutAwayQuantity > 0)
      .flatMap((item) => {
        const entry = automatic.data.items.find(
          (candidate) => candidate.goodsReceiptItemId === item.id
        )
        const allocations = getSuggestedQuantities(
          item,
          entry?.suggestions.filter((value) => usable.has(value.slotId)) ?? []
        )
        const remaining = Math.max(
          0,
          Math.round(
            (item.remainingPutAwayQuantity -
              allocations.reduce((sum, line) => sum + line.quantity, 0)) *
              100
          ) / 100
        )
        return [
          ...allocations,
          ...(remaining > 0 ? [{ slotId: '', quantity: remaining }] : []),
        ].map(({ slotId, quantity }) => ({
          goodsReceiptItemId: item.id,
          slotId,
          ...(getPutawayRemainingInput(item, quantity) ?? {
            enteredQuantity: quantity,
            enteredUnitId: item.baseUnitId,
          }),
        }))
      })
    // Không bỏ mất dòng chưa có gợi ý hoặc phần số lượng chưa được phân bổ.
    if (next.some((line) => line.slotId))
      form.setValue('lines', next, { shouldDirty: true, shouldValidate: true })
  }, [autoFill, receipt, automatic.data, automatic.isFetching, form, slots])

  // Chỉ giữ vị trí có trong danh sách chọn của form để "Dùng vị trí này" luôn điền được.
  const usableSlotIds = new Set(
    slots.filter((slot) => !slot.unavailableReason).map((slot) => slot.id)
  )
  const currentResponse = response === undefined ? automatic.data : response
  const suggestions: PutAwaySuggestionsResponse | null = currentResponse
    ? {
        ...currentResponse,
        items: currentResponse.items.map((entry) => ({
          ...entry,
          suggestions: entry.suggestions.filter((suggestion) =>
            usableSlotIds.has(suggestion.slotId)
          ),
        })),
      }
    : null

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
    isSuggesting: mutation.isPending || automatic.isFetching,
    onSuggest: () => void suggest(),
    onApply: apply,
    onApplyBest: applyBest,
    onClear: () => setResponse(null),
  }
}
