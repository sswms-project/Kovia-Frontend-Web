import type { AiInboundRequestPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { toOperationalDateTimeInput } from '@/lib/operational-date-time'
import type { InboundRequestFormValues } from '../schemas/inbound-request.schema'
import { INBOUND_SOURCE_TYPE, type InboundSourceType } from '../types/inbound-request.types'

const SOURCE_TYPES: readonly string[] = Object.values(INBOUND_SOURCE_TYPE)

function isInboundSourceType(value: string | null | undefined): value is InboundSourceType {
  return value != null && SOURCE_TYPES.includes(value)
}

/**
 * Maps an AI draft to the create form. `fallbackCode` is the code the form already shows (the
 * suggested one) so a draft without a code does not blank it. Every payload field maps to a form field.
 */
export function inboundRequestFormValuesFromAiDraft(
  payload: AiInboundRequestPayload,
  fallbackCode: string
): InboundRequestFormValues {
  return {
    inboundRequestCode: payload.inboundRequestCode || fallbackCode,
    warehouseId: payload.warehouseId ?? '',
    receivingAssignedTo: payload.receivingAssignedTo ?? '',
    sourceType: isInboundSourceType(payload.sourceType)
      ? payload.sourceType
      : INBOUND_SOURCE_TYPE.Supplier,
    supplierId: payload.supplierId ?? '',
    sourceName: payload.sourceName ?? '',
    sourceReference: payload.sourceReference ?? '',
    expectedDate: toOperationalDateTimeInput(payload.expectedDate),
    lines:
      payload.lines.length > 0
        ? payload.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitId: line.unitId ?? '',
          }))
        : [{ productId: '', quantity: 1, unitId: '' }],
  }
}
