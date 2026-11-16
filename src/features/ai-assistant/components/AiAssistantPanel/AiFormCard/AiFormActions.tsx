import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { AiFormStep } from '../../../types/ai-form.types'
import { AI_FORM_TOUCH_BUTTON } from '../../../utils/ai-form-touch-classes'

interface AiFormActionsProps {
  readonly step: AiFormStep
  readonly isSubmitting: boolean
  readonly onCancel: () => void
  readonly onBack: () => void
  readonly onNext: () => void
  readonly onSubmit: () => void
}

/** Cancel on the left; back and the step's forward action on the right. */
export function AiFormActions({
  step,
  isSubmitting,
  onCancel,
  onBack,
  onNext,
  onSubmit,
}: AiFormActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={AI_FORM_TOUCH_BUTTON}
        disabled={isSubmitting}
        onClick={onCancel}
      >
        <X aria-hidden="true" />
        Hủy
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        {step === 2 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={AI_FORM_TOUCH_BUTTON}
            disabled={isSubmitting}
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
            Quay lại
          </Button>
        ) : null}
        {step === 1 ? (
          <Button type="button" size="sm" className={AI_FORM_TOUCH_BUTTON} onClick={onNext}>
            Tiếp theo
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className={AI_FORM_TOUCH_BUTTON}
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? <Spinner /> : <Check aria-hidden="true" />}
            Xem bản nháp
          </Button>
        )}
      </div>
    </div>
  )
}
