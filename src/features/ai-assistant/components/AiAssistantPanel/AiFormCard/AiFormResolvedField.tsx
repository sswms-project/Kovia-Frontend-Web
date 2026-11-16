import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AiFormEntityValue } from '../../../schemas/ai-form-card.schema'
import { AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_WIDTH } from '../../../utils/ai-form-touch-classes'
import { AiCodeText } from '../AiCodeText'

// The names wrap instead of truncating: at 320px a cut-off warehouse or recipient cannot be told apart.
export const AI_FORM_CHIP_CLASS =
  'h-auto min-w-0 flex-1 justify-start py-1 text-left whitespace-normal'

interface AiFormResolvedFieldProps {
  readonly label: string
  readonly value: AiFormEntityValue
  readonly onChange: () => void
}

/** A field the assistant already filled in, as one line with a way to change it. */
export function AiFormResolvedField({ label, value, onChange }: AiFormResolvedFieldProps) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Badge variant="outline" className={AI_FORM_CHIP_CLASS}>
        <span className="break-words">
          {label}: <AiCodeText>{value.label}</AiCodeText>
        </span>
      </Badge>
      <Button
        type="button"
        variant="link"
        size="sm"
        className={cn('shrink-0 px-1', AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_WIDTH)}
        aria-label={`Đổi ${label.toLowerCase()}`}
        onClick={onChange}
      >
        Đổi
      </Button>
    </div>
  )
}
