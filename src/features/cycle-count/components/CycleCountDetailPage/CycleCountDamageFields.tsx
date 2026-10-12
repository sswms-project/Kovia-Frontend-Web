'use client'

import { ImagePlus, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { DamageEvidenceFile } from '../../hooks/use-damage-evidence-upload'
import {
  DAMAGE_EVIDENCE_ACCEPT,
  DAMAGE_EVIDENCE_MAX_COUNT,
  DAMAGE_REASON_MAX_LENGTH,
} from '../../utils/cycle-count-damage'

interface CycleCountDamageFieldsProps {
  readonly reason: string
  /** Ảnh đã lưu từ lần ghi nhận trước; chỉ xem, không gỡ được. */
  readonly savedEvidence: readonly DamageEvidenceFile[]
  /** Ảnh vừa chụp, chưa lưu cùng dòng kiểm kê. */
  readonly addedEvidence: readonly DamageEvidenceFile[]
  readonly isUploading: boolean
  readonly error: string | null
  readonly disabled: boolean
  readonly onReasonChange: (reason: string) => void
  readonly onAddFile: (file: File) => void
  readonly onRemoveAdded: (id: string) => void
  readonly onDownload: (id: string, fileName: string) => void
}

export function CycleCountDamageFields({
  reason,
  savedEvidence,
  addedEvidence,
  isUploading,
  error,
  disabled,
  onReasonChange,
  onAddFile,
  onRemoveAdded,
  onDownload,
}: CycleCountDamageFieldsProps) {
  const reasonId = useId()
  const fileInputId = useId()
  const totalCount = savedEvidence.length + addedEvidence.length
  const cannotAdd = disabled || isUploading || totalCount >= DAMAGE_EVIDENCE_MAX_COUNT
  const hasNoEvidence = totalCount === 0

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={reason.trim().length === 0}>
        <FieldLabel htmlFor={reasonId}>
          Lý do / tình trạng hàng hỏng <span className="text-destructive">*</span>
        </FieldLabel>
        <Textarea
          id={reasonId}
          rows={2}
          disabled={disabled}
          maxLength={DAMAGE_REASON_MAX_LENGTH}
          value={reason}
          placeholder="Ví dụ: Thùng móp, rách bao bì, rò rỉ"
          aria-invalid={reason.trim().length === 0}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>
      <Field data-invalid={hasNoEvidence}>
        <FieldLabel htmlFor={fileInputId}>
          Ảnh hàng hỏng <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-disabled={cannotAdd}
            className={cannotAdd ? 'pointer-events-none opacity-50' : undefined}
          >
            <label htmlFor={fileInputId} className="cursor-pointer">
              {isUploading ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <ImagePlus aria-hidden="true" data-icon="inline-start" />
              )}
              {isUploading ? 'Đang tải ảnh…' : 'Chụp / thêm ảnh'}
            </label>
          </Button>
          <Input
            id={fileInputId}
            type="file"
            className="sr-only"
            accept={DAMAGE_EVIDENCE_ACCEPT}
            capture="environment"
            disabled={cannotAdd}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onAddFile(file)
              event.target.value = ''
            }}
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {totalCount}/{DAMAGE_EVIDENCE_MAX_COUNT} ảnh
          </span>
        </div>
        <FieldDescription>Cần ít nhất 1 ảnh (JPG/PNG, tối đa 5 MB mỗi ảnh).</FieldDescription>
        {error ? <FieldError role="alert">{error}</FieldError> : null}
        {totalCount > 0 ? (
          <ul className="mt-1 flex flex-col gap-1">
            {savedEvidence.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 border px-2 py-1 text-xs"
              >
                <button
                  type="button"
                  className="min-w-0 truncate text-left underline-offset-2 hover:underline"
                  onClick={() => onDownload(file.id, file.fileName)}
                >
                  {file.fileName}
                </button>
                <span className="text-muted-foreground shrink-0">Đã lưu</span>
              </li>
            ))}
            {addedEvidence.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 border px-2 py-1 text-xs"
              >
                <span className="min-w-0 truncate">{file.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  aria-label={`Bỏ ảnh ${file.fileName}`}
                  onClick={() => onRemoveAdded(file.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Field>
    </div>
  )
}
