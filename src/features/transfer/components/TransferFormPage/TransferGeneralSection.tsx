import { Controller, type UseFormReturn } from 'react-hook-form'
import { DatePickerField } from '@/components/forms/DatePickerField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TriangleAlert } from 'lucide-react'
import type { TransferDestinationLoad } from '../../types/transfer.types'
import {
  BusinessCodeField,
  type BusinessCodeFieldProps,
} from '@/components/forms/BusinessCodeField'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'

export interface WarehouseSelectOption {
  readonly id: string
  readonly name: string
  readonly address: string | null
}

export type TransferFormMode = 'create' | 'draft' | 'edit'

interface TransferGeneralSectionProps {
  readonly destinationLoad?: TransferDestinationLoad
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly mode: TransferFormMode
  readonly destinationOptions: readonly WarehouseSelectOption[]
  readonly sourceOptions: readonly WarehouseSelectOption[]
  readonly warehousesLocked: boolean
  /** Tên chủ doanh nghiệp và quản lý gợi ý cho ô Người yêu cầu; vẫn nhập tay được. */
  readonly requesterNames: readonly string[]
  readonly codeSuggestionStatus?: BusinessCodeFieldProps['suggestionStatus']
  readonly canCreateRelocation: boolean
  readonly onCodeChange: () => void
  readonly onDestinationChange: (value: string) => void
  readonly onSourceChange: (value: string) => void
  /** Điều chuyển nội bộ vị trí là việc của task Relocation, không nằm trong phiếu này. */
  readonly onSelectInternalRelocation: () => void
}

export function TransferGeneralSection({
  destinationLoad,
  form,
  mode,
  destinationOptions,
  sourceOptions,
  warehousesLocked,
  requesterNames,
  codeSuggestionStatus,
  canCreateRelocation,
  onCodeChange,
  onDestinationChange,
  onSourceChange,
  onSelectInternalRelocation,
}: TransferGeneralSectionProps) {
  const errors = form.formState.errors
  /** Lỗi thứ tự ngày gắn ở ô "ngày về"; đổi một trong hai ngày phải kiểm lại cả hai để lỗi hiện ngay. */
  const setPlannedDate = (name: 'plannedTransferDate' | 'requiredBy', value: string) => {
    form.setValue(name, value, { shouldDirty: true })
    void form.trigger(['plannedTransferDate', 'requiredBy'])
  }
  const destinationWarehouseId = form.watch('destinationWarehouseId')
  const sourceWarehouseId = form.watch('sourceWarehouseId')
  const destinationAddress =
    destinationOptions.find((warehouse) => warehouse.id === destinationWarehouseId)?.address ?? ''
  const sourceAddress =
    sourceOptions.find((warehouse) => warehouse.id === sourceWarehouseId)?.address ?? ''

  return (
    <section className="bg-card border p-4" aria-labelledby="transfer-form-general">
      <h2 id="transfer-form-general" className="mb-3 text-sm font-semibold">
        Thông tin chung
      </h2>
      {mode === 'create' ? (
        <fieldset className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
          <legend className="sr-only">Loại điều chuyển</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="transfer-kind" checked readOnly />
            Điều chuyển giữa các kho
          </label>
          <label
            className={
              canCreateRelocation
                ? 'flex items-center gap-2 text-sm'
                : 'text-muted-foreground flex items-center gap-2 text-sm'
            }
          >
            <input
              type="radio"
              name="transfer-kind"
              checked={false}
              disabled={!canCreateRelocation}
              onChange={onSelectInternalRelocation}
            />
            Điều chuyển nội bộ vị trí trong kho
            <span className="text-muted-foreground text-xs">
              {canCreateRelocation
                ? '(tạo công việc điều chuyển vị trí)'
                : '(cần quyền tạo công việc kho)'}
            </span>
          </label>
        </fieldset>
      ) : null}
      <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BusinessCodeField
          label="Mã yêu cầu điều chuyển"
          error={errors.transferCode}
          suggestionStatus={codeSuggestionStatus}
          description={
            mode === 'edit'
              ? 'Mã yêu cầu không đổi sau khi đã gửi.'
              : 'Có thể sửa; để trống thì hệ thống tự cấp.'
          }
          inputProps={{
            ...form.register('transferCode', { onChange: onCodeChange }),
            id: 'transfer-code',
            maxLength: 100,
            disabled: mode === 'edit',
            className: 'font-mono',
          }}
        />
        <Field data-invalid={Boolean(errors.requesterName)}>
          <FieldLabel htmlFor="transfer-requester">Người yêu cầu</FieldLabel>
          <Input
            id="transfer-requester"
            list="transfer-requester-options"
            maxLength={200}
            autoComplete="off"
            placeholder="Chọn hoặc nhập tên"
            aria-invalid={Boolean(errors.requesterName)}
            {...form.register('requesterName')}
          />
          <datalist id="transfer-requester-options">
            {requesterNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <FieldError>{errors.requesterName?.message}</FieldError>
        </Field>
        <Field className="md:col-span-2" data-invalid={Boolean(errors.requestingDepartment)}>
          <FieldLabel htmlFor="transfer-department">Bộ phận yêu cầu</FieldLabel>
          <Input
            id="transfer-department"
            maxLength={200}
            autoComplete="off"
            aria-invalid={Boolean(errors.requestingDepartment)}
            {...form.register('requestingDepartment')}
          />
          <FieldError>{errors.requestingDepartment?.message}</FieldError>
        </Field>
        <div className="min-w-0 xl:col-span-2">
          <Controller
            control={form.control}
            name="plannedTransferDate"
            render={({ field }) => (
              <DatePickerField
                id="transfer-planned-date"
                label="Ngày dự kiến điều chuyển"
                withTime
                disablePastDates={mode !== 'edit'}
                triggerRef={field.ref}
                onBlur={field.onBlur}
                value={field.value ?? ''}
                error={errors.plannedTransferDate?.message}
                onChange={(value) => setPlannedDate('plannedTransferDate', value)}
              />
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 xl:col-span-2">
          <Controller
            control={form.control}
            name="requiredBy"
            render={({ field }) => (
              <DatePickerField
                id="transfer-required-by"
                label="Ngày hàng dự kiến về kho nhập"
                withTime
                disablePastDates={mode !== 'edit'}
                triggerRef={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                error={errors.requiredBy?.message}
                onChange={(value) => setPlannedDate('requiredBy', value)}
              />
            )}
          />
          {destinationLoad && destinationLoad.total >= destinationLoad.threshold ? (
            <Alert
              role="status"
              aria-live="polite"
              className="border-warning/40 bg-warning-container/30 text-warning"
            >
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>
                Kho nhập đã có {destinationLoad.total} yêu cầu dự kiến về ngày này (
                {destinationLoad.inboundRequestCount} nhập kho, {destinationLoad.transferCount} điều
                chuyển). Nên chọn ngày khác. Bạn vẫn có thể tiếp tục.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <Field data-invalid={Boolean(errors.destinationWarehouseId)}>
          <FieldLabel htmlFor="transfer-destination">Kho nhập</FieldLabel>
          <NativeSelect
            id="transfer-destination"
            className="w-full"
            disabled={warehousesLocked}
            aria-invalid={Boolean(errors.destinationWarehouseId)}
            value={destinationWarehouseId}
            onChange={(event) => onDestinationChange(event.target.value)}
          >
            <NativeSelectOption value="">Chọn kho nhập</NativeSelectOption>
            {destinationOptions.map((warehouse) => (
              <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{errors.destinationWarehouseId?.message}</FieldError>
        </Field>
        <Field className="md:col-span-1 xl:col-span-3">
          <FieldLabel htmlFor="transfer-destination-address">Địa chỉ kho nhập</FieldLabel>
          <Input
            id="transfer-destination-address"
            readOnly
            tabIndex={-1}
            value={destinationAddress}
          />
        </Field>
        <Field data-invalid={Boolean(errors.sourceWarehouseId)}>
          <FieldLabel htmlFor="transfer-source">Kho xuất</FieldLabel>
          <NativeSelect
            id="transfer-source"
            className="w-full"
            disabled={warehousesLocked || !destinationWarehouseId}
            aria-invalid={Boolean(errors.sourceWarehouseId)}
            value={sourceWarehouseId}
            onChange={(event) => onSourceChange(event.target.value)}
          >
            <NativeSelectOption value="">
              {destinationWarehouseId ? 'Chọn kho xuất' : 'Chọn kho nhập trước'}
            </NativeSelectOption>
            {sourceOptions.map((warehouse) => (
              <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{errors.sourceWarehouseId?.message}</FieldError>
        </Field>
        <Field className="md:col-span-1 xl:col-span-3">
          <FieldLabel htmlFor="transfer-source-address">Địa chỉ kho xuất</FieldLabel>
          <Input id="transfer-source-address" readOnly tabIndex={-1} value={sourceAddress} />
        </Field>
        <Field className="md:col-span-2 xl:col-span-4" data-invalid={Boolean(errors.reason)}>
          <FieldLabel htmlFor="transfer-reason">Lý do điều chuyển</FieldLabel>
          <Input
            id="transfer-reason"
            maxLength={500}
            placeholder="Ví dụ: bổ sung hàng cho kho bán lẻ"
            aria-invalid={Boolean(errors.reason)}
            {...form.register('reason')}
          />
          <FieldError>{errors.reason?.message}</FieldError>
        </Field>
        <Field className="md:col-span-2 xl:col-span-4" data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="transfer-note">Ghi chú cho kho</FieldLabel>
          <Textarea
            id="transfer-note"
            rows={2}
            maxLength={1000}
            aria-invalid={Boolean(errors.note)}
            {...form.register('note')}
          />
          <FieldError>{errors.note?.message}</FieldError>
        </Field>
      </FieldGroup>
      {warehousesLocked ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Chỉ đổi được kho khi phiếu chưa có đợt xuất nào.
        </p>
      ) : null}
    </section>
  )
}
