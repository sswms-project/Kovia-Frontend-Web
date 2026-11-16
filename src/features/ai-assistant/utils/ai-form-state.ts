import type {
  AiFormCardData,
  AiFormDraft,
  AiFormEntityValue,
  AiFormLine,
  AiFormProductSnapshot,
  AiFormValues,
} from '../schemas/ai-form-card.schema'
import type {
  AiFormFieldErrors,
  AiFormFieldKey,
  AiFormStatus,
  AiFormStep,
} from '../types/ai-form.types'
import { createAiFormLine } from './ai-form-lines'
import { readAiFormPrefill } from './ai-form-prefill'
import { validateAiFormLines } from './ai-form-validation'

export interface AiFormState {
  readonly values: AiFormValues
  readonly step: AiFormStep
  readonly status: AiFormStatus
  /** Last number used in a line key; keys never repeat, so a reset row is a new row for React. */
  readonly lineSequence: number
  readonly errors: AiFormFieldErrors
  /**
   * Fields the card already resolved, shown as a chip with "Đổi" on the first step. Leaving the step
   * or pressing "Đổi" turns them into pickers. Absent for the draft editor, which has no chips.
   */
  readonly compactKeys?: readonly AiFormFieldKey[]
}

export type AiFormAction =
  | {
      readonly type: 'setEntity'
      readonly key: 'warehouse' | 'recipient' | 'supplier' | 'destinationWarehouse'
      readonly value: AiFormEntityValue | null
      /** A warehouse whose products are not bound to it (inbound) leaves the rows as they are. */
      readonly keepLines?: boolean
    }
  | { readonly type: 'setPurpose'; readonly value: string }
  | { readonly type: 'setExpectedDate'; readonly value: string }
  | { readonly type: 'addLine'; readonly maxLines: number }
  | {
      readonly type: 'selectProduct'
      readonly key: string
      readonly product: AiFormProductSnapshot | null
    }
  | { readonly type: 'setQuantity'; readonly key: string; readonly quantity: string }
  | { readonly type: 'setUnit'; readonly key: string; readonly unitId: string }
  | { readonly type: 'removeLine'; readonly key: string }
  | { readonly type: 'goToStep'; readonly step: AiFormStep }
  | { readonly type: 'expandField'; readonly key: AiFormFieldKey }
  | { readonly type: 'setErrors'; readonly errors: AiFormFieldErrors }
  | { readonly type: 'finish'; readonly status: Exclude<AiFormStatus, 'open'> }

export function createInitialAiFormState(
  form: AiFormCardData,
  draft: AiFormDraft | null
): AiFormState {
  if (draft) {
    const lines = draft.values.lines.length > 0 ? draft.values.lines : [createAiFormLine(1)]
    return {
      values: { ...draft.values, lines },
      step: draft.step,
      // The BE closing the flow wins over a draft saved while it was still open.
      status: form.status === 'open' ? draft.status : form.status,
      lineSequence: Math.max(draft.lineSequence, 1),
      errors: {},
      // Chips only belong to a card still on its first step; a draft saved there keeps them.
      compactKeys: draft.step === 1 ? readAiFormPrefill(form).compactKeys : [],
    }
  }

  const { values, lineSequence, step, compactKeys } = readAiFormPrefill(form)
  return { values, step, status: form.status, lineSequence, errors: {}, compactKeys }
}

function without(
  errors: AiFormFieldErrors,
  ...keys: (keyof AiFormFieldErrors)[]
): AiFormFieldErrors {
  const rest = { ...errors }
  keys.forEach((key) => delete rest[key])
  return rest
}

/** Replaces the lines. A shown lines error follows the edit: it goes away once the lines are valid. */
function withLines(
  state: AiFormState,
  lines: readonly AiFormLine[],
  lineSequence = state.lineSequence
): AiFormState {
  const error = state.errors.lines ? validateAiFormLines(lines) : undefined
  const errors = without(state.errors, 'lines')
  return {
    ...state,
    lineSequence,
    values: { ...state.values, lines: [...lines] },
    errors: error ? { ...errors, lines: error } : errors,
  }
}

function updateLine(
  state: AiFormState,
  key: string,
  update: (line: AiFormLine) => AiFormLine
): AiFormState {
  return withLines(
    state,
    state.values.lines.map((line) => (line.key === key ? update(line) : line))
  )
}

export function aiFormReducer(state: AiFormState, action: AiFormAction): AiFormState {
  if (state.status !== 'open') return state

  switch (action.type) {
    case 'setEntity': {
      const next = {
        ...state,
        values: { ...state.values, [action.key]: action.value },
        errors: without(state.errors, action.key),
      }
      // The products on offer depend on the warehouse: another warehouse invalidates the picked ones.
      if (
        action.key !== 'warehouse' ||
        action.keepLines ||
        action.value?.id === state.values.warehouse?.id
      ) {
        return next
      }
      const lineSequence = state.lineSequence + 1
      return withLines(
        { ...next, errors: without(next.errors, 'lines') },
        [createAiFormLine(lineSequence)],
        lineSequence
      )
    }
    case 'setPurpose':
      return {
        ...state,
        values: { ...state.values, purpose: action.value },
        errors: without(state.errors, 'purpose'),
      }
    case 'setExpectedDate':
      return {
        ...state,
        values: { ...state.values, expectedDate: action.value },
        errors: without(state.errors, 'expectedDate'),
      }
    case 'addLine': {
      if (state.values.lines.length >= action.maxLines) return state
      const lineSequence = state.lineSequence + 1
      return withLines(state, [...state.values.lines, createAiFormLine(lineSequence)], lineSequence)
    }
    case 'selectProduct':
      return updateLine(state, action.key, (line) => ({
        ...line,
        product: action.product,
        // Another product has its own units: fall back to its base unit.
        unitId: action.product?.baseUnitId ?? '',
      }))
    case 'setQuantity':
      return updateLine(state, action.key, (line) => ({ ...line, quantity: action.quantity }))
    case 'setUnit':
      return updateLine(state, action.key, (line) => ({ ...line, unitId: action.unitId }))
    case 'removeLine': {
      const remaining = state.values.lines.filter((line) => line.key !== action.key)
      // The last row is never deleted, only emptied.
      const lineSequence = remaining.length > 0 ? state.lineSequence : state.lineSequence + 1
      return withLines(
        state,
        remaining.length > 0 ? remaining : [createAiFormLine(lineSequence)],
        lineSequence
      )
    }
    case 'goToStep':
      return { ...state, step: action.step, errors: {}, compactKeys: [] }
    case 'expandField':
      return { ...state, compactKeys: state.compactKeys?.filter((key) => key !== action.key) }
    case 'setErrors':
      // Server errors on the first step's fields send the user back there.
      return {
        ...state,
        errors: action.errors,
        step: action.errors.warehouse || action.errors.recipient ? 1 : state.step,
      }
    case 'finish':
      return { ...state, status: action.status, errors: {} }
  }
}
