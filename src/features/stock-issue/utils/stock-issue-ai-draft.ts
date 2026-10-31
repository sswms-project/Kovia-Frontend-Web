import type { AiStockIssueRequestPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import type { CreateStockIssueRequestFormValues } from '../schemas/stock-issue.schema'

interface StockIssueAiDraftFallback {
  /** Code the form already shows (the suggested one), kept when the draft has none. */
  readonly code: string
  /** Issue date the form defaults to, used when the draft has no date. */
  readonly issueDate: string
}

/** Maps an AI draft to the create form; every payload field has a matching form field. */
export function stockIssueFormValuesFromAiDraft(
  payload: AiStockIssueRequestPayload,
  fallback: StockIssueAiDraftFallback
): CreateStockIssueRequestFormValues {
  return {
    stockIssueRequestCode: payload.stockIssueRequestCode || fallback.code,
    stockRecipientId: payload.stockRecipientId,
    warehouseId: payload.warehouseId,
    purpose: payload.purpose ?? '',
    referenceCode: payload.referenceCode ?? '',
    issueDate: payload.issueDate
      ? `${payload.issueDate}${payload.issueTime ? `T${payload.issueTime.slice(0, 5)}` : ''}`
      : fallback.issueDate,
    note: payload.note ?? '',
    lines:
      payload.items.length > 0
        ? payload.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitId: item.unitId ?? '',
            note: item.note ?? '',
          }))
        : [{ productId: '', quantity: 1, unitId: '', note: '' }],
  }
}
