import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AiAnswerFeedbackProps {
  readonly helpful: boolean | null
  readonly onRate: (helpful: boolean | null) => void
}

/** Bấm lại nút đang chọn để bỏ đánh giá. */
export function AiAnswerFeedback({ helpful, onRate }: AiAnswerFeedbackProps) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Đánh giá câu trả lời">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Câu trả lời hữu ích"
        aria-pressed={helpful === true}
        className={cn('text-muted-foreground', helpful === true && 'text-primary')}
        onClick={() => onRate(helpful === true ? null : true)}
      >
        <ThumbsUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Câu trả lời chưa đúng"
        aria-pressed={helpful === false}
        className={cn('text-muted-foreground', helpful === false && 'text-destructive')}
        onClick={() => onRate(helpful === false ? null : false)}
      >
        <ThumbsDown aria-hidden="true" />
      </Button>
    </div>
  )
}
