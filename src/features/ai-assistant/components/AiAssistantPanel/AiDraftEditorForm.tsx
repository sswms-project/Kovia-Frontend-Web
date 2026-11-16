'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAiDraftEditor } from '../../hooks/use-ai-draft-editor'
import type { AiDraftEditorResponse } from '../../schemas/ai-draft-edit.schema'
import type { AiDraftEditDescriptor } from '../../utils/ai-draft-edit-descriptors'
import { getCurrentAiDraftEditorWarnings } from '../../utils/ai-draft-edit-warnings'
import { AI_TOUCH_MIN_HEIGHT } from '../../utils/ai-form-touch-classes'
import { AiDraftEditorActions } from './AiDraftEditorActions'
import { AiDraftEditorLines } from './AiDraftEditorLines'
import { AiDraftEditorParties } from './AiDraftEditorParties'
import { AiDraftWarnings } from './AiDraftWarnings'

interface AiDraftEditorFormProps {
  readonly editor: AiDraftEditorResponse
  /** What this draft type edits and how it reads; resolved once by the orchestrator. */
  readonly descriptor: AiDraftEditDescriptor
  /** Leave the editor (saved, or the changes were given up). */
  readonly onClose: () => void
  /** Drop the restored values and start again from the saved draft. */
  readonly onDiscardRestored: () => void
}

/**
 * The fields of a draft being edited in place. It reuses the wizard's pickers, product rows and
 * reducer, but not its flow: nothing is stored, no message is created, and "Xem trước" saves the
 * draft itself. Shortage is shown by the rows as advice and never stops a save.
 */
export function AiDraftEditorForm({
  editor,
  descriptor,
  onClose,
  onDiscardRestored,
}: AiDraftEditorFormProps) {
  const idPrefix = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    state,
    edit,
    lineErrors,
    isDirty,
    hasRestoredEdit,
    isSaving,
    hasClearedProducts,
    save,
    discard,
  } = useAiDraftEditor(editor, descriptor, onClose)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const { values, errors } = state
  // The BE's warnings belong to the revision the editor opened on: edits make parts of them stale.
  const current = getCurrentAiDraftEditorWarnings(editor, values, descriptor)

  // Entering the editor puts the cursor in its first field.
  useEffect(() => {
    document.getElementById(`${idPrefix}-warehouse`)?.focus()
  }, [idPrefix])

  const handleSave = () => {
    if (save()) return
    // The first field that still needs attention takes focus, once its error has rendered.
    requestAnimationFrame(() =>
      containerRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    )
  }

  return (
    <div ref={containerRef} data-ai-motion="step" className="flex min-w-0 flex-col gap-3">
      {hasRestoredEdit ? (
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-x-2 rounded-md px-2 py-1 text-xs">
          <p role="status">Đã khôi phục thay đổi chưa lưu</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className={cn('h-auto px-1', AI_TOUCH_MIN_HEIGHT)}
            onClick={onDiscardRestored}
          >
            Bỏ khôi phục
          </Button>
        </div>
      ) : null}
      <AiDraftWarnings warnings={current.warnings} recheckNote={current.recheckNote} />
      {/* Not `disabled`: that would drop focus from the field being typed in. `edit` ignores input while saving. */}
      <fieldset aria-busy={isSaving} className="flex min-w-0 flex-col gap-3">
        <legend className="sr-only">{descriptor.legend}</legend>
        <div className="grid min-w-0 gap-3 @lg/ai-panel:grid-cols-2">
          <AiDraftEditorParties
            idPrefix={idPrefix}
            descriptor={descriptor}
            values={values}
            errors={errors}
            dispatch={edit}
          />
        </div>
        {/* Stays mounted so a screen reader announces the note when it appears; empty:-mt-4 cancels its flex gap. */}
        <div aria-live="polite" className="empty:-mt-4">
          {hasClearedProducts ? (
            <p className="text-warning text-xs">
              Đã đổi {descriptor.warehouseLabel.toLowerCase()} nên danh sách sản phẩm được làm
              trống. Hãy chọn lại sản phẩm theo kho mới.
            </p>
          ) : null}
        </div>
        <AiDraftEditorLines
          idPrefix={idPrefix}
          descriptor={descriptor}
          values={values}
          errors={errors}
          lineErrors={lineErrors}
          dispatch={edit}
        />
      </fieldset>
      <AiDraftEditorActions
        isSaving={isSaving}
        isDiscardOpen={isDiscardOpen}
        onDiscard={() => (isDirty ? setIsDiscardOpen(true) : discard())}
        onDiscardOpenChange={setIsDiscardOpen}
        onConfirmDiscard={discard}
        onSave={handleSave}
      />
    </div>
  )
}
