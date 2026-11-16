import type { AiDraftEditorResponse, AiDraftWarning } from '../schemas/ai-draft-edit.schema'
import type { AiFormValues } from '../schemas/ai-form-card.schema'
import { AI_DRAFT_INFO_WARNING_CODES } from '../types/ai-draft-edit.types'
import type { AiDraftEditDescriptor } from './ai-draft-edit-descriptors'
import { createInitialAiDraftEditState, getLineSignature } from './ai-draft-edit-state'

/** A shortage note carries the quantities it compared; any other warning (a reset date) does not. */
export function isAiDraftShortageWarning(warning: AiDraftWarning): boolean {
  return warning.availableBaseQuantity != null || warning.requestedBaseQuantity != null
}

export function isAiDraftInfoWarning(warning: AiDraftWarning): boolean {
  return AI_DRAFT_INFO_WARNING_CODES.includes(warning.code)
}

const LINE_WARNING_FIELD = /^lines\.(\d+)/

export interface AiDraftEditorWarnings {
  readonly warnings: readonly AiDraftWarning[]
  /** Neutral line for what was dropped as stale; null when nothing was. */
  readonly recheckNote: string | null
}

/**
 * The warnings the BE sent for the revision the editor opened on, minus those an edit has made stale:
 * another warehouse (only where products are bound to it), another supplier, date or destination, or a changed
 * product, unit or quantity on the line a warning names. Dropped warnings are not replaced by
 * guesses; only the PUT answers for the new content.
 */
export function getCurrentAiDraftEditorWarnings(
  editor: AiDraftEditorResponse,
  values: AiFormValues,
  descriptor: AiDraftEditDescriptor
): AiDraftEditorWarnings {
  const saved = createInitialAiDraftEditState(editor).values
  const hasWarehouseChanged =
    descriptor.isStockBound && (values.warehouse?.id ?? '') !== (saved.warehouse?.id ?? '')
  const hasFieldChanged: Readonly<Record<string, boolean>> = {
    supplier: (values.supplier?.id ?? '') !== (saved.supplier?.id ?? ''),
    destinationWarehouse:
      (values.destinationWarehouse?.id ?? '') !== (saved.destinationWarehouse?.id ?? ''),
    expectedDate: (values.expectedDate ?? '') !== (saved.expectedDate ?? ''),
  }
  const currentByKey = new Map(values.lines.map((line) => [line.key, line]))
  const changedKeys = new Set(
    saved.lines
      .filter((line) => {
        const current = currentByKey.get(line.key)
        return (
          !current ||
          JSON.stringify(getLineSignature(current)) !== JSON.stringify(getLineSignature(line))
        )
      })
      .map((line) => line.key)
  )

  const warnings: AiDraftWarning[] = []
  const recheckKeys = new Set<string>()
  let hasDroppedForWarehouse = false
  for (const warning of editor.warnings) {
    const index = LINE_WARNING_FIELD.exec(warning.field ?? '')?.[1]
    const lineKey = index === undefined ? null : `line-${Number(index) + 1}`
    const isStockWarning = lineKey !== null || isAiDraftShortageWarning(warning)
    const isStale =
      (hasWarehouseChanged && isStockWarning) ||
      hasFieldChanged[warning.field ?? ''] === true ||
      (lineKey !== null && changedKeys.has(lineKey)) ||
      (lineKey === null && isAiDraftShortageWarning(warning) && changedKeys.size > 0)
    if (!isStale) {
      warnings.push(warning)
    } else if (hasWarehouseChanged) {
      hasDroppedForWarehouse = true
    } else if (!isAiDraftInfoWarning(warning) && isStockWarning) {
      // A shortage that names no row could be any changed one. Info and supplier/date warnings
      // (fixed by the edit itself) need no re-check.
      for (const key of lineKey === null ? changedKeys : [lineKey]) recheckKeys.add(key)
    }
  }

  const rows = values.lines
    .flatMap((line, position) => (recheckKeys.has(line.key) ? [position + 1] : []))
    .join(', ')
  const recheckNote = hasDroppedForWarehouse
    ? `Đã đổi ${descriptor.warehouseLabel.toLowerCase()} nên cảnh báo tồn trước đó không còn áp dụng. Cần kiểm tra lại sau khi lưu.`
    : rows
      ? `Cần kiểm tra lại sau khi lưu: sản phẩm ${rows}.`
      : null
  return { warnings, recheckNote }
}
