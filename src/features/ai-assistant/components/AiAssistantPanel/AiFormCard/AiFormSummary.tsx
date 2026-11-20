import { useEffect, useRef, useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatOperationalDate } from '@/features/inbound-request/utils/inbound-request-format'
import { formatStockIssueQuantity } from '@/features/stock-issue/utils/stock-issue-format'
import type { AiDraftEditDescriptor } from '../../../utils/ai-draft-edit-descriptors'
import type { AiFormValues } from '../../../schemas/ai-form-card.schema'
import type { AiFormStatus } from '../../../types/ai-form.types'
import { getAiFormLineUnit } from '../../../utils/ai-form-lines'
import { cn } from '@/lib/utils'
import { AI_FORM_TOUCH_BUTTON, AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { AiCodeText } from '../AiCodeText'

const STATUS_LABELS = {
  submitted: 'Đã lập bản nháp',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
} as const

const STATUS_NOTES = {
  cancelled: 'Không có gì được gửi đi.',
  expired: 'Biểu mẫu đã hết hạn hoặc không còn hợp lệ nên dữ liệu đã nhập không được gửi đi.',
} as const

interface AiFormSummaryProps {
  readonly values: AiFormValues
  readonly status: Exclude<AiFormStatus, 'open'>
  /** A cancelled or expired form can start again; a submitted one already has its draft. */
  readonly onRestart?: () => void
  /** The form the user was working in just turned into this summary, so its focused control is gone. */
  readonly focusOnMount?: boolean
  /** Labels of a non stock-issue form; absent for the stock issue form. */
  readonly descriptor?: AiDraftEditDescriptor
  /** What the form prepares, as in "Biểu mẫu {documentName}". */
  readonly documentName?: string
}

/** What the user sent, as history. The draft card below is what is acted on, so this stays one line. */
function SubmittedValues({
  values,
  descriptor,
}: {
  readonly values: AiFormValues
  readonly descriptor?: AiDraftEditDescriptor
}) {
  const filledLines = values.lines.filter((line) => line.product)
  const partnerKey = descriptor?.partner.key ?? 'recipient'
  const purposeLabel = descriptor ? descriptor.purposeLabel : 'Mục đích'

  return (
    <dl className="animate-in fade-in-0 animation-duration-200 mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs motion-reduce:animate-none">
      <dt className="text-muted-foreground">{descriptor?.warehouseLabel ?? 'Kho xuất'}</dt>
      <dd className="font-medium break-words">
        <AiCodeText>{values.warehouse?.label ?? ''}</AiCodeText>
      </dd>
      <dt className="text-muted-foreground">{descriptor?.partner.label ?? 'Người nhận'}</dt>
      <dd className="font-medium break-words">
        <AiCodeText>{values[partnerKey]?.label ?? ''}</AiCodeText>
      </dd>
      {descriptor?.expectedDateLabel && values.expectedDate ? (
        <>
          <dt className="text-muted-foreground">{descriptor.expectedDateLabel}</dt>
          <dd className="font-medium">{formatOperationalDate(values.expectedDate)}</dd>
        </>
      ) : null}
      <dt className="text-muted-foreground">Sản phẩm</dt>
      <dd className="font-medium">
        <ul className="flex flex-col gap-0.5">
          {filledLines.map((line) => (
            <li key={line.key} className="break-words">
              {line.product?.name} · {formatStockIssueQuantity(Number(line.quantity))}{' '}
              {getAiFormLineUnit(line)?.unitName ?? line.product?.baseUnitName}
            </li>
          ))}
        </ul>
      </dd>
      {purposeLabel ? (
        <>
          <dt className="text-muted-foreground">{purposeLabel}</dt>
          <dd className="font-medium break-words">{values.purpose}</dd>
        </>
      ) : null}
    </dl>
  )
}

/** Read-only form after it was submitted, cancelled, ran out of time or became invalid. */
export function AiFormSummary({
  values,
  status,
  onRestart,
  focusOnMount,
  descriptor,
  documentName = 'phiếu xuất kho',
}: AiFormSummaryProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const isSubmitted = status === 'submitted'
  // Local to this leaf: expanding it re-renders nothing else in the thread.
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Only when focus fell to the page: a timeout must not pull it away from the composer.
    const active = document.activeElement
    if (focusOnMount && (!active || active === document.body)) sectionRef.current?.focus()
  }, [focusOnMount])

  if (isSubmitted) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
        <section
          ref={sectionRef}
          tabIndex={-1}
          aria-label={`Biểu mẫu lập bản nháp ${documentName}`}
          className="bg-muted/30 min-w-0 rounded-md border px-3 py-1.5 outline-none"
        >
          <CollapsibleTrigger
            className={cn(
              'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-1.5 rounded-sm py-1 text-left text-xs outline-none focus-visible:ring-[3px]',
              AI_TOUCH_MIN_HEIGHT
            )}
          >
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform duration-(--ai-motion-hover) ease-(--ai-ease-out) in-data-[state=open]:rotate-90 motion-reduce:transition-none"
            />
            <span className="min-w-0 break-words">
              Biểu mẫu {documentName} · {STATUS_LABELS.submitted.toLowerCase()}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-1">
            <SubmittedValues values={values} descriptor={descriptor} />
          </CollapsibleContent>
        </section>
      </Collapsible>
    )
  }

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-label={`Biểu mẫu lập bản nháp ${documentName}`}
      className="bg-card min-w-0 rounded-md border p-3 outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">Biểu mẫu {documentName}</p>
        <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{STATUS_NOTES[status]}</p>

      {onRestart ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('mt-2', AI_FORM_TOUCH_BUTTON)}
          onClick={onRestart}
        >
          <RotateCcw aria-hidden="true" />
          Bắt đầu lại
        </Button>
      ) : null}
    </section>
  )
}
