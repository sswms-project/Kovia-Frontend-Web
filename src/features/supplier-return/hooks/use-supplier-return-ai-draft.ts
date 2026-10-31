import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useAiDraftFormPrefill } from '@/features/ai-assistant/hooks/use-ai-draft-prefill'
import type { AiSupplierReturnPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { AI_ACTIONS } from '@/features/ai-assistant/types/ai-assistant.types'
import type { CreateSupplierReturnFormValues } from '../schemas/supplier-return.schema'
import type { SupplierReturnStockOption } from '../types/supplier-return.types'
import {
  enrichSupplierReturnLines,
  supplierReturnFormValuesFromAiDraft,
} from '../utils/supplier-return-ai-draft'

function toFormValues(payload: AiSupplierReturnPayload, current: CreateSupplierReturnFormValues) {
  return supplierReturnFormValuesFromAiDraft(payload, current.supplierReturnCode ?? '')
}

interface UseSupplierReturnAiDraftOptions {
  /** Chỉ truyền khi hộp thoại đang ở chế độ tạo mới. */
  readonly draftId: string | null
  readonly form: UseFormReturn<CreateSupplierReturnFormValues>
  /** Hàng tồn của phiếu nhận nguồn đã chọn; chưa tải xong thì chưa bổ sung được thông tin dòng. */
  readonly stocks: readonly SupplierReturnStockOption[] | undefined
}

/** Điền sẵn hộp thoại trả hàng NCC từ bản nháp của Trợ lý AI, rồi bổ sung nhãn/đơn vị/giới hạn cho từng dòng. */
export function useSupplierReturnAiDraft({
  draftId,
  form,
  stocks,
}: UseSupplierReturnAiDraftOptions) {
  const aiDraft = useAiDraftFormPrefill<AiSupplierReturnPayload, CreateSupplierReturnFormValues>({
    draftId,
    expectedAction: AI_ACTIONS.createSupplierReturn,
    form,
    toFormValues,
  })
  const enrichedDraftId = useRef<string | null>(null)

  // The draft carries stock ids only: add label, unit and limits once the source stocks have loaded.
  useEffect(() => {
    if (!aiDraft.draftId || enrichedDraftId.current === aiDraft.draftId || !stocks) return
    const lines = form.getValues('lines')
    if (lines.length === 0) return
    form.setValue('lines', enrichSupplierReturnLines(lines, stocks))
    if (lines.every((line) => stocks.some((stock) => stock.id === line.inventoryStockId))) {
      enrichedDraftId.current = aiDraft.draftId
    }
  }, [aiDraft.draftId, form, stocks])

  return aiDraft
}
