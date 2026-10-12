'use client'

import { ImagePlus, X } from 'lucide-react'
import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { PutawayDeviationPanel as SharedPanel } from '@/components/operations/putaway'
import type { PutawayFormValues } from '../../schemas/inbound.schema'
import { PUTAWAY_EVIDENCE_ACCEPT, PUTAWAY_EVIDENCE_MAX_COUNT } from '../../utils/putaway-plan'

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
  const canAddMore = evidence.items.length < PUTAWAY_EVIDENCE_MAX_COUNT

  return (
    <SharedPanel
      reasonCode={form.watch('overrideReasonCode') ?? ''}
      note={form.watch('overrideReason') ?? ''}
      onReasonChange={(value) => form.setValue('overrideReasonCode', value, { shouldDirty: true })}
      onNoteChange={(value) => form.setValue('overrideReason', value, { shouldDirty: true })}
      error={reasonError}
      disabled={disabled}
      title={title}
      noteRequired={noteRequired}
    >
      <Field data-disabled={disabled}>
        <FieldLabel htmlFor={fileInputId}>Ảnh minh họa (tùy chọn)</FieldLabel>
        <FieldDescription>JPG/PNG, tối đa 3 ảnh, mỗi ảnh tối đa 5 MB.</FieldDescription>
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
    </SharedPanel>
  )
}
