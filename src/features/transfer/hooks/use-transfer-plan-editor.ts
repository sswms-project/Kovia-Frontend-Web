'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { TransferDetail, TransferPutAwayPlanSuggestions } from '../types/transfer.types'
import { createTransferPutawayPlanSchema } from '../schemas/transfer-putaway-plan.schema'
import {
  applyTransferPlanSuggestions,
  buildTransferPlanDraft,
  reconcileTransferPlanDraft,
  type TransferPlanDraftItem,
} from '../utils/transfer-putaway-plan'
import { describeTransferError } from '../utils/transfer-errors'
import { useSetTransferPutAwayPlanMutation } from './use-transfer-putaway-plan'

export function useTransferPlanEditor(
  transfer: TransferDetail | undefined,
  precisionByUnit: ReadonlyMap<string, number>,
  canManage: boolean
) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [draft, setDraft] = useState<TransferPlanDraftItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reloadRequired, setReloadRequired] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const version = useRef<string | null>(null)
  const locked = useRef(false)
  const mutation = useSetTransferPutAwayPlanMutation()

  function change(next: TransferPlanDraftItem[]) {
    if (locked.current || !canManage) return
    setDraft(next)
    setIsDirty(true)
    setErrors({})
  }
  return {
    isOpen,
    isDirty,
    draft,
    errors,
    reloadRequired,
    errorMessage,
    isPending: mutation.isPending,
    open: () => {
      if (!transfer || locked.current) return
      version.current = transfer.version
      setDraft(buildTransferPlanDraft(transfer.items))
      setErrors({})
      setIsDirty(
        canManage &&
          transfer.items.some(
            (item) =>
              !item.putAwayPlan?.length &&
              item.destinationSlotId &&
              item.destinationSlotPath &&
              item.quantity > item.stoppedQuantity
          )
      )
      setErrorMessage(null)
      setReloadRequired(false)
      setIsOpen(true)
    },
    close: () => {
      if (!locked.current) setIsOpen(false)
    },
    change,
    seedSuggestions: (suggestions: TransferPutAwayPlanSuggestions) => {
      if (!transfer || !canManage || locked.current || !isOpen || isDirty || reloadRequired) return
      const generated = applyTransferPlanSuggestions(draft, transfer.items, suggestions)
      const next = draft.map((entry) => {
        const item = transfer.items.find((item) => item.id === entry.itemId)
        return item?.putAwayPlan?.length || (item?.destinationSlotId && item.destinationSlotPath)
          ? entry
          : (generated.find((item) => item.itemId === entry.itemId) ?? entry)
      })
      if (JSON.stringify(next) !== JSON.stringify(draft)) change(next)
    },
    apply: (
      suggestions: TransferPutAwayPlanSuggestions,
      only?: { itemId: string; slotId: string }
    ) => {
      if (transfer && isOpen && !reloadRequired)
        change(applyTransferPlanSuggestions(draft, transfer.items, suggestions, only))
    },
    rebase: (fresh: TransferDetail, source: 'reload' | 'saved' = 'reload') => {
      if (locked.current) return
      version.current = fresh.version
      setDraft(
        source === 'saved'
          ? buildTransferPlanDraft(fresh.items)
          : reconcileTransferPlanDraft(draft, fresh.items)
      )
      setErrors({})
      setReloadRequired(false)
      setErrorMessage(
        source === 'saved'
          ? null
          : 'Đã tải kế hoạch mới; số lượng đang sửa được giữ lại. Hãy kiểm tra trước khi lưu.'
      )
    },
    submit: async () => {
      if (!transfer || !canManage || locked.current || reloadRequired) return false
      const parsed = createTransferPutawayPlanSchema(transfer.items, precisionByUnit).safeParse({
        expectedVersion: version.current ?? '',
        items: draft,
      })
      if (!parsed.success) {
        setErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
          )
        )
        setErrorMessage('Hãy kiểm tra các trường được đánh dấu trước khi lưu.')
        return false
      }
      locked.current = true
      try {
        await mutation.mutateAsync({ transferId: transfer.id, request: parsed.data })
        setIsDirty(false)
        setIsOpen(false)
        toast.success('Đã lưu kế hoạch cất hàng.')
        return true
      } catch (error) {
        const result = describeTransferError(error, 'Không thể lưu kế hoạch cất hàng.')
        setErrorMessage(
          result.kind === 'unknown-result'
            ? 'Chưa xác định được kết quả lưu. Tải lại để đối chiếu trước khi thao tác tiếp; nội dung đang sửa được giữ lại.'
            : result.message
        )
        if (result.kind !== 'rejected') setReloadRequired(true)
        return false
      } finally {
        locked.current = false
      }
    },
  }
}
