'use client'

import { ImagePlus, TriangleAlert, X } from 'lucide-react'
import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { PutawayFormValues } from '../../schemas/inbound.schema'
import {
  PUTAWAY_EVIDENCE_ACCEPT,
  PUTAWAY_EVIDENCE_MAX_COUNT,
  PUTAWAY_REASON_MAX_LENGTH,
  PUTAWAY_REASON_MIN_LENGTH,
  PUTAWAY_REASON_OPTIONS,
} from '../../utils/putaway-plan'

export interface PutawayEvidenceItem {
  readonly id: string
  readonly fileName: string
}

export interface PutawayEvidenceState {
  readonly items: readonly PutawayEvidenceItem[]
  readonly isUploading: boolean
  readonly error: string | null
  readonly onAdd: (file: File) => void
  readonly onRemove: (id: string) => void
}

interface PutawayDeviationPanelProps {
  readonly form: UseFormReturn<PutawayFormValues>
  readonly reasonError: string | null
  readonly disabled: boolean
  readonly evidence: PutawayEvidenceState
  /** Vì sao cần lý do: khác kế hoạch, dùng vị trí đang chừa, hoặc thông báo từ máy chủ. */
  readonly title?: string
  readonly noteRequired: boolean
}

export function PutawayDeviationPanel({
  form,
  reasonError,
  disabled,
  evidence,
  title = 'Bạn đang cất khác kế hoạch của quản lý',
  noteRequired,
}: PutawayDeviationPanelProps) {
  const fileInputId = useId()
  const reasonId = useId()
  const reasonCodeId = useId()
  const canAddMore = evidence.items.length < PUTAWAY_EVIDENCE_MAX_COUNT

  return (
    <section
      className="bg-card border-l-warning animate-in fade-in-0 slide-in-from-top-2 animation-duration-250 border border-l-4 motion-reduce:animate-none"
      aria-labelledby={`${reasonId}-title`}
    >
      <div className="flex items-start gap-3 border-b p-4">
        <TriangleAlert aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <h2 id={`${reasonId}-title`} className="text-sm font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground text-xs">
            Chọn nhóm lý do để quản lý nắm được. Ảnh minh họa là tùy chọn (JPG/PNG, tối đa{' '}
            {PUTAWAY_EVIDENCE_MAX_COUNT} ảnh, mỗi ảnh 5 MB).
          </p>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <Field data-disabled={disabled}>
          <FieldLabel htmlFor={reasonCodeId}>Nhóm lý do</FieldLabel>
          <NativeSelect
            id={reasonCodeId}
            className="w-full"
            disabled={disabled}
            {...form.register('overrideReasonCode')}
          >
            <NativeSelectOption value="">Chọn nhóm lý do</NativeSelectOption>
            {PUTAWAY_REASON_OPTIONS.map((option) => (
              <NativeSelectOption key={option.code} value={option.code}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={Boolean(reasonError)} data-disabled={disabled}>
          <FieldLabel htmlFor={reasonId}>
            {noteRequired ? 'Mô tả lý do' : 'Ghi chú thêm (tùy chọn)'}
          </FieldLabel>
          <Textarea
            id={reasonId}
            rows={3}
            disabled={disabled}
            maxLength={PUTAWAY_REASON_MAX_LENGTH}
            aria-invalid={Boolean(reasonError)}
            aria-describedby={`${reasonId}-hint ${reasonId}-error`}
            placeholder="Ví dụ: Vị trí kế hoạch đã đầy, chuyển sang kệ gần cửa"
            {...form.register('overrideReason')}
          />
          <FieldDescription id={`${reasonId}-hint`}>
            {noteRequired
              ? `Tối thiểu ${PUTAWAY_REASON_MIN_LENGTH} ký tự.`
              : 'Nhóm lý do đã chọn là đủ; ghi thêm nếu cần.'}
          </FieldDescription>
          <FieldError id={`${reasonId}-error`}>{reasonError}</FieldError>
        </Field>
        <Field data-disabled={disabled}>
          <FieldLabel htmlFor={fileInputId}>Ảnh minh họa (tùy chọn)</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              aria-disabled={disabled || evidence.isUploading || !canAddMore}
            >
              <label
                htmlFor={fileInputId}
                className={
                  disabled || evidence.isUploading || !canAddMore
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              >
                {evidence.isUploading ? (
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                ) : (
                  <ImagePlus aria-hidden="true" data-icon="inline-start" />
                )}
                {evidence.isUploading ? 'Đang tải ảnh…' : 'Thêm ảnh'}
              </label>
            </Button>
            <Input
              id={fileInputId}
              type="file"
              className="sr-only"
              accept={PUTAWAY_EVIDENCE_ACCEPT}
              disabled={disabled || evidence.isUploading || !canAddMore}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) evidence.onAdd(file)
                event.target.value = ''
              }}
            />
            <span className="text-muted-foreground text-xs tabular-nums">
              {evidence.items.length}/{PUTAWAY_EVIDENCE_MAX_COUNT} ảnh
            </span>
          </div>
          {evidence.error ? (
            <FieldError
              role="alert"
              className="animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 motion-reduce:animate-none"
            >
              {evidence.error}
            </FieldError>
          ) : null}
          {evidence.items.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {evidence.items.map((item) => (
                <li
                  key={item.id}
                  className="animate-in fade-in-0 slide-in-from-left-2 animation-duration-200 flex items-center justify-between gap-2 border px-2 py-1 text-xs motion-reduce:animate-none"
                >
                  <span className="min-w-0 truncate">{item.fileName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled}
                    aria-label={`Bỏ ảnh ${item.fileName}`}
                    onClick={() => evidence.onRemove(item.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
      </div>
    </section>
  )
}
