import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { AiDraftWarning } from '../../schemas/ai-draft-edit.schema'
import { AI_DRAFT_VIEW_STATES, type AiDraftViewState } from '../../types/ai-draft-edit.types'
import { getAiDraftEditDescriptor } from '../../utils/ai-draft-edit-descriptors'
import { AI_DRAFT_CONFLICT_MESSAGES } from '../../utils/ai-draft-edit-errors'
import { AI_FORM_TOUCH_BUTTON } from '../../utils/ai-form-touch-classes'
import { AiDraftWarnings } from './AiDraftWarnings'

const DEFAULT_READY_NOTE = 'Bản nháp hợp lệ · sẵn sàng xác nhận.'

interface AiDraftNoticesProps {
  /** Action of the draft; the ready note says what is checked later for that type. */
  readonly action?: string | null
  readonly viewState: AiDraftViewState
  /** Advisory warnings of the last saved edit; shown while the saved content is what is on the card. */
  readonly warnings: readonly AiDraftWarning[]
  readonly isReloading: boolean
  readonly onReload: () => void
}

/** What the card has to tell besides its content. One polite live region, so a change is announced once. */
export function AiDraftNotices({
  action,
  viewState,
  warnings,
  isReloading,
  onReload,
}: AiDraftNoticesProps) {
  const showWarnings =
    viewState === AI_DRAFT_VIEW_STATES.PREVIEW ||
    viewState === AI_DRAFT_VIEW_STATES.READY_TO_CONFIRM

  return (
    // Stays mounted so a change is announced; empty:-mt-3 cancels the card's flex gap while it is empty.
    <div aria-live="polite" className="flex min-w-0 flex-col gap-2 empty:-mt-3">
      {viewState === AI_DRAFT_VIEW_STATES.CONFLICT ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="min-w-0 flex-1 basis-48">
            {AI_DRAFT_CONFLICT_MESSAGES.DRAFT_REVISION_MISMATCH}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(AI_FORM_TOUCH_BUTTON, 'aria-disabled:opacity-50')}
            aria-disabled={isReloading}
            aria-busy={isReloading}
            onClick={() => {
              if (!isReloading) onReload()
            }}
          >
            {isReloading ? <Spinner /> : <RefreshCw aria-hidden="true" />}
            Tải lại bản mới nhất
          </Button>
        </div>
      ) : null}
      {viewState === AI_DRAFT_VIEW_STATES.EXPIRED ? (
        <p className="text-muted-foreground text-xs">{AI_DRAFT_CONFLICT_MESSAGES.DRAFT_EXPIRED}</p>
      ) : null}
      {viewState === AI_DRAFT_VIEW_STATES.READY_TO_CONFIRM ? (
        <p className="text-muted-foreground text-xs">
          {getAiDraftEditDescriptor(action)?.readyNote ?? DEFAULT_READY_NOTE}
        </p>
      ) : null}
      {showWarnings ? <AiDraftWarnings warnings={warnings} /> : null}
    </div>
  )
}
