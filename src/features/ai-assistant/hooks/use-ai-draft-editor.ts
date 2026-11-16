import { useEffect, useReducer, useRef, useState } from 'react'
import type { AiDraftEditorResponse } from '../schemas/ai-draft-edit.schema'
import { AI_DRAFT_STATUSES } from '../types/ai-assistant.types'
import {
  clearAiDraftEditValues,
  loadAiDraftEditValues,
  saveAiDraftEditValues,
} from '../utils/ai-draft-edit-storage'
import type { AiDraftEditDescriptor } from '../utils/ai-draft-edit-descriptors'
import {
  createInitialAiDraftEditState,
  getAiDraftEditSignature,
} from '../utils/ai-draft-edit-state'
import type { AiFormLineErrors } from '../utils/ai-form-lines'
import { aiFormReducer, type AiFormAction } from '../utils/ai-form-state'
import { useUpdateAiDraftMutation } from './use-ai-draft-edit'

/**
 * The edit session of one draft: the form values (the wizard's reducer), what the BE said about each
 * row, whether anything changed, and Save. The values are local on purpose and start from `editor`,
 * or from unsaved values of the same revision left in sessionStorage by a reload. What is stored is
 * only a convenience: Save and Xác nhận always work from the BE's current revision.
 */
export function useAiDraftEditor(
  editor: AiDraftEditorResponse,
  descriptor: AiDraftEditDescriptor,
  onClose: () => void
) {
  const [restored] = useState(() =>
    editor.status === AI_DRAFT_STATUSES.pending
      ? loadAiDraftEditValues(editor.draftId, editor.revision)
      : null
  )
  const [state, dispatch] = useReducer(aiFormReducer, restored, (stored) =>
    createInitialAiDraftEditState(editor, stored)
  )
  // Dirty is measured against the saved draft, never against what was restored.
  const [initialSignature] = useState(() =>
    getAiDraftEditSignature(createInitialAiDraftEditState(editor).values)
  )
  // Server messages of a row, by line key; a row's message goes away as soon as the user touches it.
  const [lineErrors, setLineErrors] = useState<Readonly<Record<string, AiFormLineErrors>>>({})
  const [hasClearedProducts, setHasClearedProducts] = useState(false)

  const mutation = useUpdateAiDraftMutation({
    draftId: editor.draftId,
    onSaved: () => {
      clearAiDraftEditValues(editor.draftId)
      onClose()
    },
    onFieldFailure: ({ fieldErrors, lineErrors: errorsByIndex }) => {
      dispatch({ type: 'setErrors', errors: fieldErrors })
      setLineErrors(
        Object.fromEntries(
          Object.entries(errorsByIndex).flatMap(([index, errors]) => {
            const line = state.values.lines[Number(index)]
            return line ? [[line.key, errors]] : []
          })
        )
      )
    },
  })

  // Set synchronously: `mutation.isPending` only turns true on the next render, so two quick clicks
  // on Save would otherwise send two requests.
  const isSubmitting = useRef(false)

  const isDirty = getAiDraftEditSignature(state.values) !== initialSignature
  const hasPickedProducts = state.values.lines.some((line) => line.product)

  // The browser asks before a reload or tab close throws the edits away.
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  // Mirrors the unsaved values (and only them) so a reload can offer them back for this revision.
  const { draftId, revision } = editor
  const { values, lineSequence } = state
  useEffect(() => {
    if (isDirty) saveAiDraftEditValues(draftId, { revision, lineSequence, values })
    else clearAiDraftEditValues(draftId)
  }, [draftId, revision, lineSequence, values, isDirty])

  /** Gives up the unsaved changes for good and leaves the editor. */
  const discard = () => {
    clearAiDraftEditValues(editor.draftId)
    onClose()
  }

  const edit = (action: AiFormAction) => {
    // The fields stay enabled while saving so focus is not lost; what is sent must not change under it.
    if (mutation.isPending) return
    // The note about the emptied list is transient: any change to the rows ends it for good.
    if (
      action.type === 'selectProduct' ||
      action.type === 'addLine' ||
      action.type === 'removeLine'
    ) {
      setHasClearedProducts(false)
    }
    if (action.type === 'setEntity' && action.key === 'warehouse') {
      // Another warehouse has other products: the reducer empties the rows, and the editor says so.
      // Where products are not bound to the warehouse (inbound) the rows stay as they are.
      if (!descriptor.isStockBound) {
        dispatch({ ...action, keepLines: true })
        return
      }
      if (action.value?.id !== state.values.warehouse?.id) {
        setHasClearedProducts(hasPickedProducts)
        setLineErrors({})
      }
    } else if (
      action.type === 'selectProduct' ||
      action.type === 'setQuantity' ||
      action.type === 'setUnit' ||
      action.type === 'removeLine'
    ) {
      setLineErrors((current) => {
        const rest = { ...current }
        delete rest[action.key]
        return rest
      })
    }
    dispatch(action)
  }

  /** Validates, then saves. False when something is still wrong and was shown instead. */
  const save = (): boolean => {
    if (isSubmitting.current || mutation.isPending) return false
    const errors = descriptor.validate(state.values, descriptor.limits)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'setErrors', errors })
      return false
    }
    const request = descriptor.toRequest(editor.revision, state.values)
    if (!request) return false
    setLineErrors({})
    isSubmitting.current = true
    mutation.mutate(request, {
      onSettled: () => {
        isSubmitting.current = false
      },
    })
    return true
  }

  return {
    state,
    edit,
    lineErrors,
    isDirty,
    hasRestoredEdit: restored !== null && isDirty,
    isSaving: mutation.isPending,
    hasClearedProducts: hasClearedProducts && !hasPickedProducts,
    save,
    discard,
  }
}
