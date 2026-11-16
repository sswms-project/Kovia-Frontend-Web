import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AI_FORM_TOUCH_BUTTON } from '../../../utils/ai-form-touch-classes'

interface AiFormLookupErrorProps {
  readonly onRetry: () => void
}

export function AiFormLookupError({ onRetry }: AiFormLookupErrorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="status">
      <span className="text-destructive">Không tải được danh sách.</span>
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
    </div>
  )
}
