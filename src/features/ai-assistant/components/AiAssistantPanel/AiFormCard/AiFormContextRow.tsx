import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AiFormEntityValue } from '../../../schemas/ai-form-card.schema'
import { cn } from '@/lib/utils'
import { AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_WIDTH } from '../../../utils/ai-form-touch-classes'
import { AiCodeText } from '../AiCodeText'
import { AI_FORM_CHIP_CLASS } from './AiFormResolvedField'

interface AiFormContextRowProps {
  readonly warehouse: AiFormEntityValue | null
  /** The second party: recipient of a stock issue, supplier of an inbound request. */
  readonly partner: AiFormEntityValue | null
  /** Short prefix of the second chip ("Nhận", "NCC"). */
  readonly partnerPrefix?: string
  /** Accessible name of the "Đổi" button, naming what it changes. */
  readonly editLabel?: string
  readonly onEdit: () => void
}

/** The first step's answers on one line, with a way back to change them. */
export function AiFormContextRow({
  warehouse,
  partner,
  partnerPrefix = 'Nhận',
  editLabel = 'Đổi kho xuất và người nhận',
  onEdit,
}: AiFormContextRowProps) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Badge variant="outline" className={AI_FORM_CHIP_CLASS}>
        <span className="break-words">
          Kho: <AiCodeText>{warehouse?.label ?? ''}</AiCodeText>
        </span>
      </Badge>
      <Badge variant="outline" className={AI_FORM_CHIP_CLASS}>
        <span className="break-words">
          {partnerPrefix}: <AiCodeText>{partner?.label ?? ''}</AiCodeText>
        </span>
      </Badge>
      <Button
        type="button"
        variant="link"
        size="sm"
        className={cn('shrink-0 px-1', AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_WIDTH)}
        aria-label={editLabel}
        onClick={onEdit}
      >
        Đổi
      </Button>
    </div>
  )
}
