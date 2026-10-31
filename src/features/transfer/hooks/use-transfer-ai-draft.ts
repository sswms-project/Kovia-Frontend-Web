import type { UseFormReturn } from 'react-hook-form'
import { useAiDraftFormPrefill } from '@/features/ai-assistant/hooks/use-ai-draft-prefill'
import type { AiTransferPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { AI_ACTIONS } from '@/features/ai-assistant/types/ai-assistant.types'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import { transferFormValuesFromAiDraft } from '../utils/transfer-ai-draft'

function toFormValues(payload: AiTransferPayload, current: TransferRequestFormValues) {
  return transferFormValuesFromAiDraft(payload, current.transferCode)
}

interface UseTransferAiDraftOptions {
  /** Chỉ truyền khi form đang ở chế độ tạo mới. */
  readonly draftId: string | null
  readonly form: UseFormReturn<TransferRequestFormValues>
}

/** Điền sẵn form điều chuyển từ bản nháp của Trợ lý AI; `complete` đánh dấu bản nháp đã dùng. */
export function useTransferAiDraft({ draftId, form }: UseTransferAiDraftOptions) {
  return useAiDraftFormPrefill<AiTransferPayload, TransferRequestFormValues>({
    draftId,
    expectedAction: AI_ACTIONS.createTransfer,
    form,
    toFormValues,
  })
}
