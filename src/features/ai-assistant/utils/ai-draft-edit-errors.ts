import { getApiErrorCode, isApiErrorResponse } from '@/lib/api-error'
import {
  AI_DRAFT_CONFLICT_CODES,
  type AiDraftConflictCode,
  type AiDraftLineFieldErrors,
} from '../types/ai-draft-edit.types'
import type {
  AiDraftExtraFieldKey,
  AiFormFieldErrors,
  AiFormFieldKey,
} from '../types/ai-form.types'
import { readAiFormSubmitFailure } from './ai-form-errors'

export const AI_DRAFT_CONFLICT_MESSAGES: Record<AiDraftConflictCode, string> = {
  DRAFT_REVISION_MISMATCH:
    'Bản nháp vừa được thay đổi ở nơi khác. Hãy tải bản mới nhất rồi kiểm tra lại.',
  DRAFT_NOT_PENDING: 'Bản nháp này đã được xử lý hoặc đã bị hủy nên không thể thay đổi nữa.',
  DRAFT_EXPIRED: 'Bản nháp đã hết hạn. Hãy nhờ Kovia lập bản nháp mới.',
}

/** Machine code of a failed edit or confirm: the top-level `code`, or `errors.code` from older envelopes. */
export function getAiDraftErrorCode(error: unknown): string | undefined {
  if (!isApiErrorResponse(error)) return undefined
  return error.code ?? getApiErrorCode(error)
}

/**
 * The 409 answer of the edit and confirm endpoints, if this error is one. A generic `CONFLICT` or a
 * 409 without a code is a concurrent confirm/edit race, so it reads as a revision mismatch.
 */
export function getAiDraftConflictCode(error: unknown): AiDraftConflictCode | undefined {
  if (!isApiErrorResponse(error) || error.statusCode !== 409) return undefined
  const code = getAiDraftErrorCode(error)
  const known = Object.values(AI_DRAFT_CONFLICT_CODES).find((conflict) => conflict === code)
  if (known) return known
  return !code || code === 'CONFLICT' ? AI_DRAFT_CONFLICT_CODES.revisionMismatch : undefined
}

export interface AiDraftEditFieldFailure {
  readonly fieldErrors: AiFormFieldErrors
  readonly lineErrors: AiDraftLineFieldErrors
  readonly hasMessages: boolean
}

const LINE_KEY = /^lines\.(\d+)\.(product|unit|quantity)$/

const EXTRA_FIELD_ALIASES: Readonly<Record<string, AiDraftExtraFieldKey | AiFormFieldKey>> = {
  supplier: 'supplier',
  supplierId: 'supplier',
  expectedDate: 'expectedDate',
  sourceWarehouse: 'warehouse',
  sourceWarehouseId: 'warehouse',
  destinationWarehouse: 'destinationWarehouse',
  destinationWarehouseId: 'destinationWarehouse',
  // The reason of a supplier return is the editor's purpose text field.
  reason: 'purpose',
}

/** The keys of the inbound, transfer and supplier-return editors, which the wizard's reader does not know. */
function readExtraFieldErrors(error: unknown): AiFormFieldErrors {
  if (!isApiErrorResponse(error)) return {}
  const extra: AiFormFieldErrors = {}
  for (const [name, messages] of Object.entries(error.errors ?? {})) {
    const key = EXTRA_FIELD_ALIASES[name]
    if (key && messages[0]) extra[key] = messages[0]
  }
  for (const { key: name, message } of error.fieldErrors ?? []) {
    const key = EXTRA_FIELD_ALIASES[name]
    if (key) extra[key] ??= message
  }
  return extra
}

/**
 * Reads the messages of a `400 VALIDATION_FAILED`: `warehouse`, `recipient`, `supplier`, `purpose`,
 * `expectedDate`, `sourceWarehouse`, `destinationWarehouse`, `reason`, `lines` for the fields and
 * `lines.{index}.product|unit|quantity` for a row. Keys
 * naming nothing known are ignored, so one unexpected entry never hides the others.
 */
export function readAiDraftEditFieldFailure(error: unknown): AiDraftEditFieldFailure {
  const fieldErrors = {
    // An alias (`sourceWarehouse`) never overrides the field's own key (`warehouse`).
    ...readExtraFieldErrors(error),
    ...readAiFormSubmitFailure(error).fieldErrors,
  }
  const lineErrors: Record<number, { product?: string; unit?: string; quantity?: string }> = {}

  for (const { key, message } of isApiErrorResponse(error) ? (error.fieldErrors ?? []) : []) {
    const match = LINE_KEY.exec(key)
    if (!match) continue
    const index = Number(match[1])
    const field = match[2] as 'product' | 'unit' | 'quantity' // the pattern admits only these three
    lineErrors[index] = { ...lineErrors[index], [field]: lineErrors[index]?.[field] ?? message }
  }

  return {
    fieldErrors,
    lineErrors,
    hasMessages: Object.keys(fieldErrors).length > 0 || Object.keys(lineErrors).length > 0,
  }
}
