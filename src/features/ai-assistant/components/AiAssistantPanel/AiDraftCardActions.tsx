import type { Ref } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { Check, ExternalLink, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { AiDraftProcessingAction } from '../../types/ai-assistant.types'
import { formatAiTime } from '../../utils/ai-assistant-format'
import { AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_HEIGHT } from '../../utils/ai-form-touch-classes'

/** Chỉnh sửa is absent when the BE does not allow editing, and disabled while the card cannot start it. */
export type AiDraftEditState = 'hidden' | 'disabled' | 'enabled'

interface AiDraftCardActionsProps {
  readonly expiresAt?: string | null
  /** Where the draft opens in the normal create form; null for an action that has none. */
  readonly openFormLink: Route | null
  readonly editState: AiDraftEditState
  readonly canConfirm: boolean
  readonly processingAction: AiDraftProcessingAction | null
  readonly isLocked: boolean
  readonly editButtonRef: Ref<HTMLButtonElement>
  readonly onEdit: () => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly onNavigate: () => void
}

/** Footer of a draft card in preview: the deadline, then the actions from least to most committing. */
export function AiDraftCardActions({
  expiresAt,
  openFormLink,
  editState,
  canConfirm,
  processingAction,
  isLocked,
  editButtonRef,
  onEdit,
  onCancel,
  onConfirm,
  onNavigate,
}: AiDraftCardActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-[11px]">
        {expiresAt
          ? `Hạn xác nhận ${formatAiTime(expiresAt)}`
          : 'Chưa có thay đổi nào được thực hiện.'}
      </p>
      {/* Quiet actions on the left, the two that move the draft forward stay together on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('text-muted-foreground', AI_FORM_TOUCH_BUTTON)}
            disabled={isLocked}
            onClick={onCancel}
          >
            {processingAction === 'cancel' ? <Spinner /> : <X aria-hidden="true" />}
            Hủy
          </Button>
          {openFormLink ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn('text-muted-foreground', AI_TOUCH_MIN_HEIGHT)}
              aria-disabled={isLocked}
              onClick={(event) => {
                if (isLocked) event.preventDefault()
              }}
            >
              <Link href={openFormLink} onNavigate={onNavigate}>
                <ExternalLink aria-hidden="true" />
                Mở trong form
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editState !== 'hidden' ? (
            <Button
              ref={editButtonRef}
              type="button"
              variant="outline"
              size="sm"
              className={AI_FORM_TOUCH_BUTTON}
              disabled={editState === 'disabled'}
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" />
              Chỉnh sửa
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={AI_FORM_TOUCH_BUTTON}
            disabled={isLocked || !canConfirm}
            onClick={onConfirm}
          >
            {processingAction === 'confirm' ? <Spinner /> : <Check aria-hidden="true" />}
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  )
}
