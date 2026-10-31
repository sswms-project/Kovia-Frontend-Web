import { Fragment } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
  AI_DRAFT_STATUSES,
  type AiCard,
  type AiDraftProcessingAction,
  type AiDraftStatus,
} from '../../types/ai-assistant.types'
import { formatAiTime } from '../../utils/ai-assistant-format'
import { getAiDraftFormLink } from '../../utils/ai-draft-links'
import { getAiActionResultLink } from '../../utils/ai-assistant-links'

const STATUS_LABELS: Record<AiDraftStatus, string> = {
  [AI_DRAFT_STATUSES.pending]: 'Chờ xác nhận',
  [AI_DRAFT_STATUSES.executed]: 'Đã thực hiện',
  [AI_DRAFT_STATUSES.cancelled]: 'Đã hủy',
  [AI_DRAFT_STATUSES.expired]: 'Hết hạn',
}

interface AiActionConfirmationCardProps {
  readonly card: AiCard
  readonly status: AiDraftStatus
  readonly resultEntityId: string | null
  /** Thao tác đang chạy trên chính thẻ này; chỉ nút tương ứng hiện spinner. */
  readonly processingAction: AiDraftProcessingAction | null
  readonly isLocked: boolean
  readonly onConfirm: (draftId: string) => void
  readonly onCancel: (draftId: string) => void
  readonly onNavigate: () => void
}

export function AiActionConfirmationCard({
  card,
  status,
  resultEntityId,
  processingAction,
  isLocked,
  onConfirm,
  onCancel,
  onNavigate,
}: AiActionConfirmationCardProps) {
  const draftId = card.draftId
  if (!draftId) return null

  const isPending = status === AI_DRAFT_STATUSES.pending
  const resultLink =
    status === AI_DRAFT_STATUSES.executed
      ? getAiActionResultLink(card.action, resultEntityId)
      : null
  const openFormLink = isPending ? getAiDraftFormLink(card.action, draftId) : null
  const details = card.details ?? []

  return (
    <section
      aria-label={`Xác nhận thao tác: ${card.summary ?? ''}`}
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-250 rounded-md border p-3 transition-colors motion-reduce:animate-none',
        isPending ? 'border-tertiary/40 bg-tertiary/5' : 'bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">{card.summary}</p>
        <Badge variant={isPending ? 'outline' : 'secondary'} className="shrink-0">
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      {details.length > 0 ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {details.map((detail, index) => (
            <Fragment key={`${detail.label}-${index}`}>
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0 font-medium break-words">{detail.value}</dd>
            </Fragment>
          ))}
        </dl>
      ) : null}

      {isPending ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px]">
            {card.expiresAt
              ? `Hạn xác nhận ${formatAiTime(card.expiresAt)}`
              : 'Chưa có thay đổi nào được thực hiện.'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {openFormLink ? (
              <Button
                asChild
                variant="outline"
                size="sm"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLocked}
              onClick={() => onCancel(draftId)}
            >
              {processingAction === 'cancel' ? <Spinner /> : <X aria-hidden="true" />}
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={isLocked} onClick={() => onConfirm(draftId)}>
              {processingAction === 'confirm' ? <Spinner /> : <Check aria-hidden="true" />}
              Xác nhận
            </Button>
          </div>
        </div>
      ) : null}

      {resultLink ? (
        <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0">
          <Link href={resultLink.href} onNavigate={onNavigate}>
            {resultLink.label}
          </Link>
        </Button>
      ) : null}
    </section>
  )
}
