import { useEffect, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useAiDraftViewStore } from '@/stores/ai-draft-view.store'
import type { AiDraftWarning } from '../schemas/ai-draft-edit.schema'
import { AI_DRAFT_STATUSES, type AiDraftStatus } from '../types/ai-assistant.types'
import type { AiDraftViewState } from '../types/ai-draft-edit.types'
import { getAiDraftViewState } from '../utils/ai-draft-view-state'

const MAX_TIMEOUT_MS = 2 ** 31 - 1
// A timer never fires early, but the clock read inside it may differ by a tick.
const EXPIRY_MARGIN_MS = 50
const NO_WARNINGS: readonly AiDraftWarning[] = []

interface UseAiDraftViewStateInput {
  readonly draftId: string
  readonly status: AiDraftStatus
  readonly expiresAt: string | null | undefined
  /** Revision the card shows, to tell whether a saved edit is the one on screen. */
  readonly revision: string | null
  readonly isEditing: boolean
  readonly isConfirming: boolean
}

export interface AiDraftView {
  readonly viewState: AiDraftViewState
  /** Advisory warnings of the saved edit the card shows; none for any other revision. */
  readonly warnings: readonly AiDraftWarning[]
}

/** Feeds `getAiDraftViewState` with the local facts: mutation in flight, conflict, saved edit, the clock. */
export function useAiDraftViewState({
  draftId,
  status,
  expiresAt,
  revision,
  isEditing,
  isConfirming,
}: UseAiDraftViewStateInput): AiDraftView {
  const isValidating =
    useIsMutating({ mutationKey: queryKeys.aiAssistant.updateAction(draftId) }) > 0
  const hasConflict = useAiDraftViewStore((state) => Boolean(state.conflictDraftIds[draftId]))
  const savedRevision = useAiDraftViewStore((state) => state.savedRevisions[draftId])
  const savedWarnings = useAiDraftViewStore((state) => state.warnings[draftId])
  const [nowMs, setNowMs] = useState(() => Date.now())

  // The card turns EXPIRED by itself when the deadline passes; a saved edit moves the deadline.
  useEffect(() => {
    if (status !== AI_DRAFT_STATUSES.pending || !expiresAt) return
    const delay = Date.parse(expiresAt) - Date.now()
    if (Number.isNaN(delay) || delay > MAX_TIMEOUT_MS) return
    const timerId = window.setTimeout(
      () => setNowMs(Date.now()),
      Math.max(0, delay) + EXPIRY_MARGIN_MS
    )
    return () => window.clearTimeout(timerId)
  }, [status, expiresAt])

  const hasSavedEdit = revision !== null && savedRevision === revision
  const viewState = getAiDraftViewState({
    status,
    expiresAt,
    nowMs,
    isEditing,
    isValidating,
    isConfirming,
    hasConflict,
    hasSavedEdit,
  })
  return { viewState, warnings: hasSavedEdit ? (savedWarnings ?? NO_WARNINGS) : NO_WARNINGS }
}
