import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface PutawayAiSuggestButtonProps {
  readonly isSuggesting: boolean
  readonly disabled?: boolean
  readonly onClick: () => void
}

/** Nút gợi ý vị trí bằng AI dùng chung cho kế hoạch và thực hiện cất hàng. */
export function PutawayAiSuggestButton({
  isSuggesting,
  disabled,
  onClick,
}: PutawayAiSuggestButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-tertiary/40 text-tertiary hover:text-tertiary"
      disabled={disabled}
      onClick={onClick}
    >
      {isSuggesting ? <Spinner aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
      {isSuggesting ? 'Đang phân tích…' : 'Gợi ý vị trí bằng AI'}
    </Button>
  )
}
