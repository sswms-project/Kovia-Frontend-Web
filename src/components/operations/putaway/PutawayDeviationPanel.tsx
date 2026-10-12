'use client'

import { useId, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { PUTAWAY_REASON_OPTIONS, type PutawayDeviationReason } from '@/types/putaway.types'

export function PutawayDeviationPanel({
  reasonCode,
  note,
  onReasonChange,
  onNoteChange,
  error,
  disabled,
  children,
  noteRequired = reasonCode === 'Other',
  title = 'Bạn đang cất khác kế hoạch của quản lý',
  reasons,
}: {
  readonly reasonCode: string
  readonly note: string
  readonly onReasonChange: (value: PutawayDeviationReason | '') => void
  readonly onNoteChange: (value: string) => void
  readonly error?: string | null
  readonly disabled: boolean
  readonly title?: string
  readonly noteRequired?: boolean
  /** Giới hạn danh sách nhóm lý do; mặc định là tất cả. */
  readonly reasons?: readonly PutawayDeviationReason[]
  readonly children?: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="bg-card border-l-warning animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 border border-l-4 motion-reduce:animate-none"
    >
      <header className="flex items-start gap-2 border-b p-3">
        <TriangleAlert aria-hidden="true" className="text-warning size-4 shrink-0" />
        <h3 id={`${id}-title`} className="text-sm font-medium">
          {title}
        </h3>
      </header>
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-reason`}>Nhóm lý do</FieldLabel>
          <NativeSelect
            id={`${id}-reason`}
            value={reasonCode}
            className="h-11 w-full"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) =>
              onReasonChange(
                PUTAWAY_REASON_OPTIONS.find((option) => option.code === event.target.value)?.code ??
                  ''
              )
            }
          >
            <NativeSelectOption value="">Chọn lý do</NativeSelectOption>
            {PUTAWAY_REASON_OPTIONS.filter(
              (option) => !reasons || reasons.includes(option.code)
            ).map((option) => (
              <NativeSelectOption key={option.code} value={option.code}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-note`}>
            {noteRequired ? 'Mô tả lý do' : 'Ghi chú thêm (tùy chọn)'}
          </FieldLabel>
          <Textarea
            id={`${id}-note`}
            value={note}
            rows={2}
            maxLength={500}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
            onChange={(event) => onNoteChange(event.target.value)}
          />
          <FieldDescription id={`${id}-hint`}>
            {noteRequired ? 'Tối thiểu 5 ký tự.' : 'Nhóm lý do đã chọn là đủ; ghi thêm nếu cần.'}
          </FieldDescription>
        </Field>
        <FieldError id={`${id}-error`} className="sm:col-span-2">
          {error}
        </FieldError>
        {children}
      </div>
    </section>
  )
}
