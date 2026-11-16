'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAiDraftConflictHandler, useAiDraftEditorQuery } from '../../hooks/use-ai-draft-edit'
import { getAiDraftEditDescriptor } from '../../utils/ai-draft-edit-descriptors'
import {
  AI_DRAFT_CONFLICT_MESSAGES,
  getAiDraftConflictCode,
} from '../../utils/ai-draft-edit-errors'
import { clearAiDraftEditValues } from '../../utils/ai-draft-edit-storage'
import { AiDraftEditorFallback } from './AiDraftEditorFallback'
import { AiDraftEditorForm } from './AiDraftEditorForm'

const NOT_EDITABLE_MESSAGE =
  'Bản nháp này chưa chỉnh sửa trực tiếp được. Hãy dùng "Mở trong form" để sửa.'

interface AiDraftEditorProps {
  readonly draftId: string
  readonly onClose: () => void
}

/**
 * Orchestrator of the inline editor of one draft: loads what the BE lets the user change and hands it
 * to the form. Mounted only while the editor is open, so nothing is requested for a card that is
 * only read. The form is keyed by revision, so a newer revision always starts from its own values.
 */
export function AiDraftEditor({ draftId, onClose }: AiDraftEditorProps) {
  const query = useAiDraftEditorQuery(draftId)
  const [restoreResets, setRestoreResets] = useState(0)
  const handleConflict = useAiDraftConflictHandler()
  const conflictCode = query.isError ? getAiDraftConflictCode(query.error) : undefined
  const reportConflict = useEffectEvent((code: NonNullable<typeof conflictCode>) =>
    handleConflict(draftId, code)
  )

  // The draft was handled or expired elsewhere: the card's status and the cache must hear of it once.
  useEffect(() => {
    if (conflictCode) reportConflict(conflictCode)
  }, [conflictCode])

  if (query.isPending) return <AiDraftEditorFallback isLoading onClose={onClose} />
  if (query.isError) {
    return (
      <AiDraftEditorFallback
        isLoading={false}
        message={
          conflictCode
            ? AI_DRAFT_CONFLICT_MESSAGES[conflictCode]
            : getApiErrorMessage(query.error, 'Không mở được trình chỉnh sửa.')
        }
        onRetry={conflictCode ? undefined : () => void query.refetch()}
        onClose={onClose}
      />
    )
  }
  // A type the BE calls editable but this FE has no descriptor for is as good as not editable.
  const descriptor = getAiDraftEditDescriptor(query.data.action)
  if (!query.data.editable || !query.data.revision || !descriptor) {
    return (
      <AiDraftEditorFallback isLoading={false} message={NOT_EDITABLE_MESSAGE} onClose={onClose} />
    )
  }
  return (
    <AiDraftEditorForm
      key={`${query.data.revision}:${restoreResets}`}
      editor={query.data}
      descriptor={descriptor}
      onClose={onClose}
      onDiscardRestored={() => {
        // A fresh form for the same revision starts from the saved draft once nothing is stored.
        clearAiDraftEditValues(draftId)
        setRestoreResets((count) => count + 1)
      }}
    />
  )
}
