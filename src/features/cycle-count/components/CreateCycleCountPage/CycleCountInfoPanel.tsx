'use client'

import { LockKeyhole } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerField } from '@/features/inbound-request/components/InboundRequestFormPage/DatePickerField'
import type { CycleCountFormApi, SelectOption } from './types'

const DEFAULT_START_TIME = '08:00'
const PURPOSE_MAX_LENGTH = 500

interface CycleCountInfoPanelProps {
  readonly form: CycleCountFormApi
  readonly staff: readonly SelectOption[]
  readonly hasWarehouse: boolean
  readonly selectedCount: number
  readonly selectedQuantity: number
}

export function CycleCountInfoPanel({
  form,
  staff,
  hasWarehouse,
  selectedCount,
  selectedQuantity,
}: CycleCountInfoPanelProps) {
  const { errors } = form.formState
  const scheduledDate = form.watch('scheduledDate')
  const dueDate = form.watch('dueDate')
  const purpose = form.watch('purpose')
  const isBlindCount = form.watch('isBlindCount')
  const scheduledTime = scheduledDate.slice(11, 16) || DEFAULT_START_TIME

  function setScheduledAt(date: string, time: string) {
    form.setValue('scheduledDate', date ? `${date}T${time || DEFAULT_START_TIME}` : '', {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <aside
      aria-label="Thông tin phiếu kiểm kê"
      className="bg-card flex min-h-0 flex-col border lg:overflow-auto"
    >
      <h2 className="shrink-0 border-b px-4 py-2.5 text-sm font-semibold">Thông tin phiếu</h2>
      <div className="flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Số phiếu</dt>
          <dd>Hệ thống tự sinh khi lưu</dd>
          <dt className="text-muted-foreground">Ngày tạo</dt>
          <dd>{new Date().toLocaleDateString('vi-VN')}</dd>
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>Chưa thực hiện</dd>
        </dl>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
          <DatePickerField
            id="scheduledDate"
            label="Ngày kiểm kê dự kiến *"
            disablePastDates
            value={scheduledDate.slice(0, 10)}
            onChange={(date) => setScheduledAt(date, scheduledTime)}
          />
          <Field>
            <FieldLabel htmlFor="scheduledTime">Giờ</FieldLabel>
            <Input
              id="scheduledTime"
              type="time"
              value={scheduledTime}
              disabled={!scheduledDate}
              onChange={(event) => setScheduledAt(scheduledDate.slice(0, 10), event.target.value)}
            />
          </Field>
          <FieldError
            className="col-span-2"
            errors={errors.scheduledDate ? [errors.scheduledDate] : undefined}
          />
        </div>
        <div>
          <DatePickerField
            id="dueDate"
            label="Kiểm kê đến ngày"
            disablePastDates
            value={dueDate}
            onChange={(date) =>
              form.setValue('dueDate', date, { shouldDirty: true, shouldValidate: true })
            }
          />
          <FieldError errors={errors.dueDate ? [errors.dueDate] : undefined} />
        </div>
        <Field data-invalid={Boolean(errors.priority)}>
          <FieldLabel htmlFor="priority">Mức ưu tiên</FieldLabel>
          <NativeSelect id="priority" {...form.register('priority')}>
            <NativeSelectOption value="Normal">Bình thường</NativeSelectOption>
            <NativeSelectOption value="Urgent">Khẩn</NativeSelectOption>
          </NativeSelect>
          <FieldError errors={errors.priority ? [errors.priority] : undefined} />
        </Field>
        <Field data-invalid={Boolean(errors.assignedTo)}>
          <FieldLabel htmlFor="assignedTo">
            Nhân viên phụ trách <span className="text-destructive">*</span>
          </FieldLabel>
          <NativeSelect id="assignedTo" disabled={!hasWarehouse} {...form.register('assignedTo')}>
            <NativeSelectOption value="">Chọn nhân viên</NativeSelectOption>
            {staff.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={errors.assignedTo ? [errors.assignedTo] : undefined} />
        </Field>
        {hasWarehouse && staff.length === 0 ? (
          <Alert>
            <AlertDescription>
              Kho này chưa có nhân viên kho đang hoạt động để giao kiểm kê.
            </AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(errors.purpose)}>
          <FieldLabel htmlFor="purpose">Mục đích</FieldLabel>
          <Textarea
            id="purpose"
            rows={3}
            maxLength={PURPOSE_MAX_LENGTH}
            placeholder="Ví dụ: Kiểm kê định kỳ cuối quý"
            {...form.register('purpose')}
          />
          <p className="text-muted-foreground text-right text-xs tabular-nums">
            {purpose.length}/{PURPOSE_MAX_LENGTH}
          </p>
          <FieldError errors={errors.purpose ? [errors.purpose] : undefined} />
        </Field>
        <div className="flex items-center justify-between gap-3 border p-3">
          <div className="flex items-start gap-2">
            <LockKeyhole className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Kiểm kê mù</p>
              <p className="text-muted-foreground text-xs">
                {isBlindCount
                  ? 'Nhân viên đếm không thấy số tồn hệ thống cho đến khi gửi kết quả.'
                  : 'Nhân viên thấy số tồn hệ thống khi đếm.'}
              </p>
            </div>
          </div>
          <Switch
            checked={isBlindCount}
            onCheckedChange={(checked) =>
              form.setValue('isBlindCount', checked, { shouldDirty: true })
            }
            aria-label="Bật kiểm kê mù"
          />
        </div>
        <p className="bg-muted/50 border p-3 text-sm">
          Đã chọn <span className="font-semibold">{selectedCount}</span> dòng · tổng tồn hệ thống{' '}
          <span className="font-mono font-semibold">{selectedQuantity}</span>
        </p>
      </div>
    </aside>
  )
}
