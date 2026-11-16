import type { AiDraftEditStored, AiDraftEditorResponse } from '../schemas/ai-draft-edit.schema'
import type { AiFormEntityValue, AiFormLine, AiFormValues } from '../schemas/ai-form-card.schema'
import { createAiFormLine, toAiFormLine } from './ai-form-lines'
import type { AiFormState } from './ai-form-state'

type EditorParty = AiDraftEditorResponse['warehouse']

/** A stored supplier that is no longer active cannot be sent again: the user has to pick another. */
const SUPPLIER_UNAVAILABLE_CODE = 'SUPPLIER_UNAVAILABLE'

function toEntityValue(party: EditorParty): AiFormEntityValue | null {
  if (!party) return null
  return { id: party.id, label: party.code ? `${party.code} - ${party.name}` : party.name }
}

/**
 * Opens the editor on the saved draft, or on unsaved values restored for this very revision. Same
 * state shape as the wizard so its reducer is reused as is.
 */
export function createInitialAiDraftEditState(
  editor: AiDraftEditorResponse,
  restored?: AiDraftEditStored | null
): AiFormState {
  if (restored) {
    const restoredLines =
      restored.values.lines.length > 0 ? restored.values.lines : [createAiFormLine(1)]
    return {
      values: { ...restored.values, lines: restoredLines },
      step: 2,
      status: 'open',
      lineSequence: Math.max(restored.lineSequence, restoredLines.length),
      errors: {},
    }
  }
  const lines: AiFormLine[] =
    editor.lines.length > 0 ? editor.lines.map(toAiFormLine) : [createAiFormLine(1)]
  const isSupplierUnavailable = editor.warnings.some(
    (warning) => warning.code === SUPPLIER_UNAVAILABLE_CODE
  )
  return {
    values: {
      warehouse: toEntityValue(editor.sourceWarehouse ?? editor.warehouse),
      recipient: toEntityValue(editor.recipient),
      supplier: isSupplierUnavailable ? null : toEntityValue(editor.supplier),
      expectedDate: editor.expectedDate?.slice(0, 10) ?? '',
      lines,
      // A supplier return's reason is edited in the same text field as a stock issue's purpose.
      purpose: editor.purpose ?? editor.reason ?? '',
      // Left out where the type has none, so stock issue and inbound state stays as it was.
      ...(editor.destinationWarehouse
        ? { destinationWarehouse: toEntityValue(editor.destinationWarehouse) }
        : {}),
    },
    step: 2,
    status: 'open',
    lineSequence: lines.length,
    errors: {},
  }
}

export function getLineSignature(line: AiFormLine) {
  return [
    line.product?.id ?? '',
    line.unitId || line.product?.baseUnitId || '',
    line.quantity.trim() === '' ? '' : Number(line.quantity),
  ]
}

/** What the BE would receive, as text: equal signatures mean the user changed nothing. */
export function getAiDraftEditSignature(values: AiFormValues): string {
  return JSON.stringify([
    values.warehouse?.id ?? '',
    values.recipient?.id ?? '',
    values.supplier?.id ?? '',
    values.expectedDate ?? '',
    values.purpose.trim(),
    values.lines.map(getLineSignature),
    ...(values.destinationWarehouse ? [values.destinationWarehouse.id] : []),
  ])
}
