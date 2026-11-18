'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useAiDraftEditTransition,
  useAiDraftFocusReturn,
} from '../../hooks/use-ai-draft-edit-transition'
import { useReloadAiDraft } from '../../hooks/use-ai-draft-edit'
import { useCloseStaleAiDraftEditor } from '../../hooks/use-ai-draft-stale-editor'
import { useAiDraftViewState } from '../../hooks/use-ai-draft-view-state'
import {
  AI_DRAFT_STATUSES,
  type AiCard,
  type AiDraftProcessingAction,
  type AiDraftStatus,
} from '../../types/ai-assistant.types'
import { AI_DRAFT_VIEW_STATES } from '../../types/ai-draft-edit.types'
import { clearAiDraftEditValues } from '../../utils/ai-draft-edit-storage'
import { getAiDraftConfirmLabel, getAiDraftFormLink } from '../../utils/ai-draft-links'
import {
  AI_DRAFT_VIEW_STATE_CAN_CONFIRM,
  AI_DRAFT_VIEW_STATE_CAN_EDIT,
  isAiDraftViewStateOpen,
} from '../../utils/ai-draft-view-state'
import { getAiActionResultLink } from '../../utils/ai-assistant-links'
import { AI_TOUCH_MIN_HEIGHT } from '../../utils/ai-form-touch-classes'
import { AiDraftCardActions, type AiDraftEditState } from './AiDraftCardActions'
import { AiDraftCardHeader } from './AiDraftCardHeader'
import { AiDraftDetails } from './AiDraftDetails'
import { AiDraftEditor } from './AiDraftEditor'
import { AiDraftNotices } from './AiDraftNotices'

interface AiActionConfirmationCardProps {
  readonly card: AiCard
  readonly status: AiDraftStatus
  readonly resultEntityId: string | null
  /** The BE allows this draft to be edited in place. */
  readonly editable?: boolean
  /** Revision the BE holds for this draft; tells whether the last saved edit is the one on screen. */
  readonly revision?: string | null
  /** Thao tác đang chạy trên chính thẻ này; chỉ nút tương ứng hiện spinner. */
  readonly processingAction: AiDraftProcessingAction | null
  readonly isLocked: boolean
  readonly onConfirm: (draftId: string) => void
  readonly onCancel: (draftId: string) => void
  readonly onNavigate: () => void
}

/**
 * One card for one draft, from preview to editor to confirmed. It owns only what is local to the card
 * (editor open or not, focus, height); what the card is comes from `useAiDraftViewState`.
 */
export function AiActionConfirmationCard({
  card,
  status,
  resultEntityId,
  editable = false,
  revision = null,
  processingAction,
  isLocked,
  onConfirm,
  onCancel,
  onNavigate,
}: AiActionConfirmationCardProps) {
  const draftId = card.draftId ?? ''
  const {
    isEditing,
    openEditor,
    closeEditor,
    bodyRef,
    sectionRef,
    editButtonRef,
    bodyStyle,
    isReleasing,
  } = useAiDraftEditTransition()
  const { reload, isReloading } = useReloadAiDraft()
  useCloseStaleAiDraftEditor({ draftId, isEditing, revision, onClose: closeEditor })
  const { viewState, warnings } = useAiDraftViewState({
    draftId,
    status,
    expiresAt: card.expiresAt,
    revision,
    isEditing,
    isConfirming: processingAction === 'confirm',
  })
  const isOpen = isAiDraftViewStateOpen(viewState)
  const isEditorOpen =
    isEditing &&
    (viewState === AI_DRAFT_VIEW_STATES.EDITING || viewState === AI_DRAFT_VIEW_STATES.VALIDATING)
  const canEdit = !isLocked && AI_DRAFT_VIEW_STATE_CAN_EDIT[viewState]
  const editState: AiDraftEditState = !editable ? 'hidden' : canEdit ? 'enabled' : 'disabled'
  useAiDraftFocusReturn({
    isEditing,
    canFocusEdit: editState === 'enabled',
    isSettled: viewState !== AI_DRAFT_VIEW_STATES.VALIDATING,
    editButtonRef,
    sectionRef,
  })

  // Confirmed, cancelled or expired: the unsaved values of the editor will never be used again.
  useEffect(() => {
    if (draftId && !isOpen) clearAiDraftEditValues(draftId)
  }, [draftId, isOpen])

  if (!draftId) return null

  const showActions = isOpen && !isEditorOpen
  const resultLink =
    status === AI_DRAFT_STATUSES.executed
      ? getAiActionResultLink(card.action, resultEntityId)
      : null

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-label={`Xác nhận thao tác: ${card.summary ?? ''}`}
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-250 flex min-w-0 flex-col gap-3 rounded-md border p-3 transition-colors outline-none motion-reduce:animate-none',
        isOpen ? 'border-tertiary/40 bg-tertiary/5' : 'bg-card'
      )}
    >
      <AiDraftCardHeader summary={card.summary} viewState={viewState} />

      <div
        ref={bodyRef}
        style={bodyStyle}
        className={cn(
          'empty:hidden',
          isReleasing &&
            'transition-[min-height] duration-(--ai-motion-expand) ease-(--ai-ease-out) motion-reduce:transition-none'
        )}
      >
        {isEditorOpen ? (
          <AiDraftEditor draftId={draftId} onClose={closeEditor} />
        ) : (
          <AiDraftDetails details={card.details ?? []} />
        )}
      </div>

      <AiDraftNotices
        action={card.action}
        viewState={viewState}
        warnings={warnings}
        isReloading={isReloading}
        onReload={() => {
          closeEditor()
          void reload(draftId)
        }}
      />

      {showActions ? (
        <AiDraftCardActions
          expiresAt={card.expiresAt}
          openFormLink={getAiDraftFormLink(card.action, draftId)}
          confirmLabel={getAiDraftConfirmLabel(card.action)}
          editState={editState}
          canConfirm={AI_DRAFT_VIEW_STATE_CAN_CONFIRM[viewState]}
          processingAction={processingAction}
          isLocked={isLocked}
          editButtonRef={editButtonRef}
          onEdit={openEditor}
          onCancel={() => onCancel(draftId)}
          onConfirm={() => onConfirm(draftId)}
          onNavigate={onNavigate}
        />
      ) : null}

      {resultLink ? (
        <Button
          asChild
          variant="link"
          size="sm"
          className={cn('h-auto self-start px-0', AI_TOUCH_MIN_HEIGHT)}
        >
          <Link href={resultLink.href} onNavigate={onNavigate}>
            {resultLink.label}
          </Link>
        </Button>
      ) : null}
    </section>
  )
}
