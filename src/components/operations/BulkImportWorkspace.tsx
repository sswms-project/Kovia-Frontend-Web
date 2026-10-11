'use client'

import { ChevronRight, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const BULK_IMPORT_STEPS = ['Chọn tệp', 'Ghép cột', 'Kiểm tra', 'Kết quả'] as const
export type BulkImportActivity = 'idle' | 'reading' | 'checking' | 'importing' | 'template'
export const BULK_IMPORT_ACTIVITY_LABELS = {
  idle: '',
  reading: 'Đang tải và đọc tệp…',
  checking: 'Đang kiểm tra dữ liệu…',
  importing: 'Đang nhập dữ liệu…',
  template: 'Đang tải mẫu…',
} as const satisfies Record<BulkImportActivity, string>

export function BulkImportMappingFields({ children }: { readonly children: ReactNode }) {
  return (
    <FieldGroup className="[container-type:normal] grid min-w-0 shrink-0 gap-3 sm:grid-cols-2">
      {children}
    </FieldGroup>
  )
}

interface BulkImportWorkspaceProps {
  readonly header: ReactNode
  readonly step: number
  readonly activity: BulkImportActivity
  readonly children: ReactNode
  readonly className?: string
}

export function BulkImportWorkspace({
  header,
  step,
  activity,
  children,
  className,
}: BulkImportWorkspaceProps) {
  return (
    <div
      data-slot="bulk-import-workspace"
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-3 pb-3 sm:pr-4 sm:pb-4 lg:pr-5 lg:pb-5 [@media(max-height:600px)]:min-h-176',
        className
      )}
      aria-busy={activity !== 'idle'}
    >
      {header}
      <ol
        aria-label="Các bước nhập dữ liệu"
        className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {BULK_IMPORT_STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? 'step' : undefined}
            className={cn(
              'border px-3 py-2 text-sm',
              step === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground'
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <p
        role={activity === 'idle' ? undefined : 'status'}
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'text-muted-foreground flex shrink-0 items-center gap-2 text-xs',
          activity === 'idle' && 'sr-only'
        )}
      >
        {activity !== 'idle' ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {activity === 'idle'
          ? `Bước ${step + 1}: ${BULK_IMPORT_STEPS[step]}`
          : BULK_IMPORT_ACTIVITY_LABELS[activity]}
      </p>
      {children}
    </div>
  )
}

interface BulkImportSummaryProps {
  readonly total: number
  readonly valid: number
}

export function BulkImportSummary({ total, valid }: BulkImportSummaryProps) {
  return (
    <section aria-label="Tổng quan bản xem trước" className="grid shrink-0 grid-cols-3 gap-2">
      {[
        { label: 'Tổng số dòng', value: total, tone: '' },
        { label: 'Hợp lệ', value: valid, tone: 'text-primary' },
        { label: 'Không hợp lệ', value: total - valid, tone: 'text-destructive' },
      ].map(({ label, value, tone }) => (
        <Card key={label} className="border-border min-w-0 gap-0 border py-0 ring-0">
          <CardContent className="flex min-h-14 items-center justify-between gap-2 px-3 py-2">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

interface BulkImportReviewHeaderProps {
  readonly fileName: string | null
  readonly selected: number
  readonly valid: number
  readonly children: ReactNode
}

export function BulkImportReviewHeader({
  fileName,
  selected,
  valid,
  children,
}: BulkImportReviewHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="text-base font-semibold">Bản xem trước</h2>
        <p className="text-muted-foreground mt-1 text-xs break-words" aria-live="polite">
          {fileName} · đã chọn {selected}/{valid} dòng hợp lệ
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </header>
  )
}

interface BulkImportSupplementaryToggleProps {
  readonly expanded: boolean
  readonly controls: string
  readonly errorCount?: number
  readonly onToggle: () => void
}

export function BulkImportSupplementaryToggle({
  expanded,
  controls,
  errorCount = 0,
  onToggle,
}: BulkImportSupplementaryToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      <ChevronRight
        data-icon="inline-start"
        aria-hidden="true"
        className={cn(
          'transition-transform duration-150 motion-reduce:transition-none',
          expanded && 'rotate-180'
        )}
      />
      {expanded ? 'Thu gọn' : 'Mở rộng'} thông tin bổ sung
      {errorCount > 0 ? (
        <>
          {' '}
          <span className="text-destructive font-semibold">· {errorCount} lỗi</span>
        </>
      ) : null}
    </Button>
  )
}

export function BulkImportPendingBody() {
  return (
    <div
      aria-label="Đang chuẩn bị dữ liệu nhập"
      aria-busy="true"
      className="flex min-h-48 min-w-0 flex-1 flex-col gap-3"
    >
      <Skeleton className="h-12 w-full motion-reduce:animate-none" />
      <Skeleton className="min-h-32 w-full flex-1 motion-reduce:animate-none" />
    </div>
  )
}

interface BulkImportDelimiterProps {
  readonly id: string
  readonly value: string
  readonly disabled: boolean
  readonly onChange: (value: string) => void
}

export function BulkImportDelimiter({ id, value, disabled, onChange }: BulkImportDelimiterProps) {
  return (
    <Field className="shrink-0 sm:max-w-80">
      <FieldLabel htmlFor={id}>Dấu phân cách CSV</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="auto">Tự nhận diện</NativeSelectOption>
        <NativeSelectOption value=",">Dấu phẩy (,)</NativeSelectOption>
        <NativeSelectOption value=";">Dấu chấm phẩy (;)</NativeSelectOption>
        <NativeSelectOption value={'\t'}>Tab</NativeSelectOption>
      </NativeSelect>
    </Field>
  )
}
