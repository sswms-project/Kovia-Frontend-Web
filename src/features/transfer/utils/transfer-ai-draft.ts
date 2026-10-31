import type { AiTransferPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import { EMPTY_TRANSFER_LINE, emptyTransferForm } from './transfer-form'

/**
 * Maps an AI draft to the create form. Warehouses, products, quantities and the suggested source and
 * destination slots map; the draft has no code, requester, reason, dates or note, and its lot hint
 * has no form field (stock is allocated FEFO/FIFO when the request is accepted).
 */
export function transferFormValuesFromAiDraft(
  payload: AiTransferPayload,
  fallbackCode: string
): TransferRequestFormValues {
  return {
    ...emptyTransferForm(),
    transferCode: fallbackCode,
    sourceWarehouseId: payload.sourceWarehouseId,
    destinationWarehouseId: payload.destinationWarehouseId,
    lines:
      payload.items.length > 0
        ? payload.items.map((item) => ({
            itemId: null,
            productId: item.productId,
            unitId: '',
            destinationSlotId: item.destinationSlotId ?? '',
            sourceSlotId: item.sourceSlotId ?? '',
            quantity: item.quantity,
          }))
        : [{ ...EMPTY_TRANSFER_LINE }],
  }
}
