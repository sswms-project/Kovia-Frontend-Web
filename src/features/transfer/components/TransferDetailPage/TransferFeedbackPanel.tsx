import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { formatOperationalDateTime } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferFeedback } from '../../types/transfer.types'
import {
  FEEDBACK_REASON_LABELS,
  FEEDBACK_STATUS_LABELS,
  labelOf,
} from '../../utils/transfer-format'

interface TransferFeedbackPanelProps {
  readonly feedbacks: readonly TransferFeedback[]
  readonly canReply: boolean
  readonly onReply: (feedback: TransferFeedback) => void
}

export function TransferFeedbackPanel({
  feedbacks,
  canReply,
  onReply,
}: TransferFeedbackPanelProps) {
  if (feedbacks.length === 0) {
    return (
      <Empty className="border-0 p-6">
        <EmptyHeader>
          <EmptyTitle>Chưa có phản hồi</EmptyTitle>
          <EmptyDescription>
            Quản lý kho báo vấn đề (thiếu hàng, hàng hỏng, không kịp hạn) sẽ hiện tại đây.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className="flex flex-col gap-3 p-3">
      {feedbacks.map((feedback) => (
        <li key={feedback.id} className="border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={feedback.status === 'Open' ? 'outline' : 'secondary'}
              className={feedback.status === 'Open' ? 'text-warning' : undefined}
            >
              {FEEDBACK_STATUS_LABELS[feedback.status]}
            </Badge>
            <span className="text-sm font-medium">
              {labelOf(FEEDBACK_REASON_LABELS, feedback.reasonCode)}
            </span>
            <span className="text-muted-foreground text-xs">
              {feedback.authorName ?? 'Quản lý kho'} ·{' '}
              {formatOperationalDateTime(feedback.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{feedback.message}</p>
          {feedback.reply ? (
            <div className="bg-muted mt-2 p-2 text-sm">
              <p className="text-muted-foreground text-xs">
                Trả lời {feedback.repliedAt ? formatOperationalDateTime(feedback.repliedAt) : ''}
              </p>
              <p className="whitespace-pre-wrap">{feedback.reply}</p>
            </div>
          ) : null}
          {canReply && feedback.status !== 'Closed' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => onReply(feedback)}
            >
              Trả lời
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
