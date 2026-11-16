import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AI_FORM_TOUCH_BUTTON } from '../../utils/ai-form-touch-classes'

interface AiDraftEditorFallbackProps {
  readonly isLoading: boolean
  /** Why the editor cannot open; shown with a way back to the preview. */
  readonly message?: string
  /** Offered only when asking again can help. */
  readonly onRetry?: () => void
  readonly onClose: () => void
}

/** What stands in for the editor while it loads, or when it cannot open. The preview stays one tap away. */
export function AiDraftEditorFallback({
  isLoading,
  message,
  onRetry,
  onClose,
}: AiDraftEditorFallbackProps) {
  if (isLoading) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Đang mở trình chỉnh sửa…</span>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col gap-2 text-xs">
      <p className="min-w-0 break-words">{message}</p>
      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={AI_FORM_TOUCH_BUTTON}
            onClick={onRetry}
          >
            <RefreshCw aria-hidden="true" />
            Thử lại
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={AI_FORM_TOUCH_BUTTON}
          onClick={onClose}
        >
          Quay lại bản xem trước
        </Button>
      </div>
    </div>
  )
}
