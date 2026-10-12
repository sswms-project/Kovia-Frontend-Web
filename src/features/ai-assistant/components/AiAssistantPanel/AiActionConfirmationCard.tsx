import { Fragment } from 'react'
import Link from 'next/link'
import { Check, Pencil, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { AI_DRAFT_STATUSES, type AiCard, type AiDraftStatus } from '../../types/ai-assistant.types'
import { getAiActionResultLink } from '../../utils/ai-assistant-links'
import { AiDraftQuantityEditor, type AiDraftQuantityEdit } from './AiDraftQuantityEditor'

const STATUS_LABELS: Record<AiDraftStatus, string> = {
  [AI_DRAFT_STATUSES.pending]: 'Chờ xác nhận',
  [AI_DRAFT_STATUSES.executed]: 'Đã thực hiện',
  [AI_DRAFT_STATUSES.cancelled]: 'Đã hủy',
  [AI_DRAFT_STATUSES.expired]: 'Hết hạn',
}

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

interface AiActionConfirmationCardProps {
  readonly card: AiCard
  readonly status: AiDraftStatus
  readonly resultEntityId: string | null
  readonly isProcessing: boolean
  readonly isLocked: boolean
  readonly onConfirm: (draftId: string) => void
  readonly onCancel: (draftId: string) => void
  readonly onNavigate: () => void
  readonly quantityEdit: AiDraftQuantityEdit
}

export function AiActionConfirmationCard({
  card,
  status,
  resultEntityId,
  isProcessing,
  isLocked,
  onConfirm,
  onCancel,
  onNavigate,
  quantityEdit,
}: AiActionConfirmationCardProps) {
  const draftId = card.draftId
  if (!draftId) return null

  const isPending = status === AI_DRAFT_STATUSES.pending
  const resultLink =
    status === AI_DRAFT_STATUSES.executed
      ? getAiActionResultLink(card.action, resultEntityId)
      : null
  const details = card.details ?? []
  const editableLines = details.filter(
    (detail) => Boolean(detail.productId) && typeof detail.quantity === 'number'
  )
  const isEditing = isPending && quantityEdit.editingDraftId === draftId
  // Đang sửa thì các dòng hàng hiện dưới dạng ô nhập bên dưới, không lặp lại ở phần chi tiết.
  const shownDetails = isEditing
    ? details.filter((detail) => !detail.productId && !detail.dateValue)
    : details

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

      {shownDetails.length > 0 ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {shownDetails.map((detail, index) => (
            <Fragment key={`${detail.label}-${index}`}>
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0 font-medium break-words">{detail.value}</dd>
            </Fragment>
          ))}
        </dl>
      ) : null}

      {isEditing ? (
        <AiDraftQuantityEditor draftId={draftId} lines={editableLines} edit={quantityEdit} />
      ) : null}

      {isPending && !isEditing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px]">
            {card.expiresAt
              ? `Hạn xác nhận ${timeFormatter.format(new Date(card.expiresAt))}`
              : 'Chưa có thay đổi nào được thực hiện.'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {editableLines.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLocked || quantityEdit.editingDraftId !== null}
                onClick={() =>
                  quantityEdit.onStart(draftId, {
                    expectedDate: details.find((detail) => detail.dateValue)?.dateValue ?? '',
                    lines: editableLines.map((line) => ({
                      productId: line.productId ?? '',
                      quantity: line.quantity ?? 0,
                    })),
                  })
                }
              >
                <Pencil aria-hidden="true" />
                Chỉnh sửa
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLocked}
              onClick={() => onCancel(draftId)}
            >
              <X aria-hidden="true" />
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={isLocked} onClick={() => onConfirm(draftId)}>
              {isProcessing ? <Spinner /> : <Check aria-hidden="true" />}
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
