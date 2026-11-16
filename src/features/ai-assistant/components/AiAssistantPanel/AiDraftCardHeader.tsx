import { Badge } from '@/components/ui/badge'
import type { AiDraftViewState } from '../../types/ai-draft-edit.types'
import {
  AI_DRAFT_VIEW_STATE_LABELS,
  AI_DRAFT_VIEW_STATE_TONES,
  type AiDraftViewTone,
} from '../../utils/ai-draft-view-state'

const BADGE_VARIANTS: Record<AiDraftViewTone, 'outline' | 'default' | 'secondary' | 'destructive'> =
  {
    pending: 'outline',
    active: 'default',
    done: 'secondary',
    inactive: 'secondary',
    attention: 'destructive',
  }

interface AiDraftCardHeaderProps {
  readonly summary?: string | null
  readonly viewState: AiDraftViewState
}

/** What the draft does, and what state it is in. */
export function AiDraftCardHeader({ summary, viewState }: AiDraftCardHeaderProps) {
  return (
    // Wraps: at 320px a longer state label drops under the summary instead of squeezing it.
    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
      <p className="min-w-0 flex-1 basis-36 text-sm font-medium break-words">{summary}</p>
      {/* A status role: a change of state is announced without moving focus. */}
      <Badge
        role="status"
        variant={BADGE_VARIANTS[AI_DRAFT_VIEW_STATE_TONES[viewState]]}
        className="shrink-0"
      >
        {AI_DRAFT_VIEW_STATE_LABELS[viewState]}
      </Badge>
    </div>
  )
}
