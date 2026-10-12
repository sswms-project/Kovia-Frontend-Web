'use client'

import { ArrowLeft, Plus, RotateCw } from 'lucide-react'
import {
  BusinessCodeField,
  type BusinessCodeFieldProps,
} from '@/components/forms/BusinessCodeField'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import {
  inboundSourceLabels,
  inboundSourceTypes,
  type InboundRequestFormValues,
} from '../../schemas/inbound-request.schema'
import { INBOUND_SOURCE_TYPE, type LookupOption } from '../../types/inbound-request.types'
import { DatePickerField } from './DatePickerField'
import { FormActions } from './FormActions'
import { InboundRequestLineRow } from './InboundRequestLineRow'
import { LookupCombobox } from './LookupCombobox'

interface InboundRequestFormProps {
  readonly title: string
  readonly autoApprove: boolean
  readonly isApprovedEdit?: boolean
  readonly form: UseFormReturn<InboundRequestFormValues>
  readonly fields: readonly FieldArrayWithId<InboundRequestFormValues, 'lines', 'id'>[]
  readonly warehouseOptions: readonly LookupOption[]
  readonly canAssign?: boolean
  readonly staffOptions?: readonly LookupOption[]
  readonly isStaffLoading?: boolean
  readonly isStaffError?: boolean
  readonly onRetryStaff?: () => void
  readonly supplierOptions: readonly LookupOption[]
  readonly productOptions: readonly LookupOption[]
  readonly productsById: Readonly<Record<string, ProductResponse>>
  readonly conversionsByProductId: Readonly<Record<string, readonly ProductUnitConversion[]>>
  readonly units: readonly UnitResponse[]
  readonly isUnitLoading: boolean
  readonly isUnitError: boolean
  readonly onRetryUnits: () => void
  readonly isWarehouseSearchLoading: boolean
  readonly isSupplierSearchLoading: boolean
  readonly isProductSearchLoading: boolean
  readonly isPending: boolean
  readonly disablePastDates?: boolean
  readonly onAddLine: () => void
  readonly onRemoveLine: (index: number) => void
  readonly onCancel: () => void
  readonly onEditCode?: () => void
  readonly codeSuggestionStatus?: BusinessCodeFieldProps['suggestionStatus']
  readonly onCodeChange?: () => void
  readonly codeDescription?: string
  readonly onSaveDraft: () => void
  readonly onSaveAndSubmit: () => void
  readonly onWarehouseSearchChange: (value: string) => void
  readonly onSupplierSearchChange: (value: string) => void
  readonly onProductSearchChange: (scope: string, value: string) => void
}

export function InboundRequestForm({
  title,
  autoApprove,
  isApprovedEdit,
  form,
  fields,
  warehouseOptions,
  canAssign,
  staffOptions = [],
  isStaffLoading,
  isStaffError,
  onRetryStaff,
  supplierOptions,
  productOptions,
  productsById,
  conversionsByProductId,
  units,
  isUnitLoading,
  isUnitError,
  onRetryUnits,
  isWarehouseSearchLoading,
  isSupplierSearchLoading,
  isProductSearchLoading,
  isPending,
  disablePastDates,
  onAddLine,
  onRemoveLine,
  onCancel,
  onEditCode,
  codeSuggestionStatus,
  onCodeChange,
  codeDescription,
  onSaveDraft,
  onSaveAndSubmit,
  onWarehouseSearchChange,
  onSupplierSearchChange,
  onProductSearchChange,
}: InboundRequestFormProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const sourceType = watch('sourceType')
  const lines = watch('lines')

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Quay lại"
          onClick={onCancel}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-muted-foreground shrink-0 text-xs">Nhập kho / Yêu cầu</span>
          <span className="text-muted-foreground text-xs">›</span>
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
        {onEditCode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={isPending || form.formState.isDirty}
            onClick={onEditCode}
            title={
              form.formState.isDirty
                ? 'Lưu hoặc hủy thay đổi trước khi chuyển sang đổi mã.'
                : 'Đổi mã mà không lưu lại nội dung yêu cầu.'
            }
          >
            Chỉ đổi mã
          </Button>
        ) : null}
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSaveAndSubmit()
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Thông tin nguồn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <BusinessCodeField
                  label="Mã yêu cầu *"
                  description={codeDescription}
                  error={errors.inboundRequestCode}
                  suggestionStatus={codeSuggestionStatus}
                  inputProps={{
                    ...register('inboundRequestCode', { onChange: onCodeChange }),
                    id: 'inboundRequestCode',
                    required: true,
                    maxLength: 100,
                    placeholder: 'VD: IR000001…',
                    disabled: isPending,
                  }}
                />
                <Field data-invalid={Boolean(errors.warehouseId)}>
                  <FieldLabel htmlFor="warehouseId">Kho nhận hàng</FieldLabel>
                  <LookupCombobox
                    id="warehouseId"
                    value={watch('warehouseId')}
                    options={warehouseOptions}
                    placeholder="Chọn hoặc tìm kho"
                    emptyMessage="Không tìm thấy kho phù hợp."
                    ariaLabel="Kho nhận hàng"
                    isLoading={isWarehouseSearchLoading}
                    isInvalid={Boolean(errors.warehouseId)}
                    onSearchChange={onWarehouseSearchChange}
                    onChange={(value) => {
                      if (value !== watch('warehouseId'))
                        setValue('receivingAssignedTo', '', { shouldDirty: true })
                      setValue('warehouseId', value, { shouldDirty: true, shouldValidate: true })
                    }}
                  />
                  <FieldDescription>
                    Vị trí cất cụ thể sẽ được chọn ở bước Cất hàng.
                  </FieldDescription>
                  <FieldError>{errors.warehouseId?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.sourceType)}>
                  <FieldLabel htmlFor="inbound-source-type">Nguồn nhập hàng</FieldLabel>
                  <NativeSelect
                    id="inbound-source-type"
                    className="w-full"
                    value={sourceType}
                    onChange={(event) =>
                      setValue(
                        'sourceType',
                        inboundSourceTypes.find((type) => type === event.target.value) ??
                          INBOUND_SOURCE_TYPE.Supplier,
                        { shouldDirty: true, shouldValidate: true }
                      )
                    }
                  >
                    {inboundSourceTypes.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {inboundSourceLabels[type]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{errors.sourceType?.message}</FieldError>
                </Field>
                {sourceType === INBOUND_SOURCE_TYPE.Supplier ? (
                  <Field data-invalid={Boolean(errors.supplierId)}>
                    <FieldLabel htmlFor="supplierId">Nhà cung cấp</FieldLabel>
                    <LookupCombobox
                      id="supplierId"
                      value={watch('supplierId')}
                      options={supplierOptions}
                      placeholder="Chọn hoặc tìm nhà cung cấp"
                      emptyMessage="Không tìm thấy nhà cung cấp phù hợp."
                      ariaLabel="Nhà cung cấp"
                      isLoading={isSupplierSearchLoading}
                      isInvalid={Boolean(errors.supplierId)}
                      onSearchChange={onSupplierSearchChange}
                      onChange={(value) =>
                        setValue('supplierId', value, { shouldDirty: true, shouldValidate: true })
                      }
                    />
                    <FieldError>{errors.supplierId?.message}</FieldError>
                  </Field>
                ) : (
                  <Field data-invalid={Boolean(errors.sourceName)}>
                    <FieldLabel htmlFor="sourceName">Tên nguồn hàng</FieldLabel>
                    <Input
                      id="sourceName"
                      maxLength={200}
                      placeholder="Tên chi nhánh, bộ phận hoặc đối tác"
                      aria-invalid={Boolean(errors.sourceName)}
                      {...register('sourceName')}
                    />
                    <FieldError>{errors.sourceName?.message}</FieldError>
                  </Field>
                )}
                <Field data-invalid={Boolean(errors.sourceReference)}>
                  <FieldLabel htmlFor="sourceReference">
                    Mã chứng từ tham chiếu (tùy chọn)
                  </FieldLabel>
                  <Input
                    id="sourceReference"
                    maxLength={100}
                    placeholder="VD: BB-2026-001"
                    aria-invalid={Boolean(errors.sourceReference)}
                    {...register('sourceReference')}
                  />
                  <FieldError>{errors.sourceReference?.message}</FieldError>
                </Field>
                <DatePickerField
                  id="expectedDate"
                  label="Ngày nhận dự kiến"
                  required
                  error={errors.expectedDate?.message}
                  disablePastDates={disablePastDates}
                  value={watch('expectedDate')}
                  onChange={(value) =>
                    setValue('expectedDate', value, { shouldDirty: true, shouldValidate: true })
                  }
                />
                {canAssign ? (
                  <Field
                    data-invalid={Boolean(errors.receivingAssignedTo)}
                    aria-busy={isStaffLoading}
                  >
                    <FieldLabel htmlFor="receivingAssignedTo">
                      Nhân viên nhận và cất hàng (tùy chọn)
                    </FieldLabel>
                    <NativeSelect
                      id="receivingAssignedTo"
                      className="w-full"
                      disabled={!watch('warehouseId') || isStaffLoading || isStaffError}
                      aria-invalid={Boolean(errors.receivingAssignedTo)}
                      {...register('receivingAssignedTo')}
                    >
                      <NativeSelectOption value="">
                        {isStaffLoading ? 'Đang tải nhân viên…' : 'Chọn nhân viên'}
                      </NativeSelectOption>
                      {staffOptions.map((staff) => (
                        <NativeSelectOption key={staff.value} value={staff.value}>
                          {staff.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {isStaffError ? (
                      <Button type="button" variant="outline" size="sm" onClick={onRetryStaff}>
                        Thử tải lại nhân viên
                      </Button>
                    ) : null}
                    <FieldError>{errors.receivingAssignedTo?.message}</FieldError>
                  </Field>
                ) : null}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm dự kiến nhập</CardTitle>
            <CardAction>
              <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
                <Plus aria-hidden="true" /> Thêm dòng
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend className="sr-only">Sản phẩm</FieldLegend>
              {errors.lines?.root?.message ? (
                <FieldError>{errors.lines.root.message}</FieldError>
              ) : null}
              {isUnitError ? (
                <div className="border-destructive/50 bg-destructive/5 mb-4 flex flex-wrap items-center justify-between gap-2 border p-3 text-sm">
                  <span>Không tải được đơn vị tính của sản phẩm. Vui lòng thử lại.</span>
                  <Button type="button" variant="outline" size="sm" onClick={onRetryUnits}>
                    <RotateCw aria-hidden="true" /> Thử lại
                  </Button>
                </div>
              ) : null}
              <div className="border">
                <div className="bg-card sticky top-0 z-10 hidden border-b px-3 py-2 lg:grid lg:grid-cols-[28px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_32px] lg:items-center lg:gap-3">
                  <span className="text-muted-foreground text-center text-xs font-medium">#</span>
                  <span className="text-muted-foreground text-xs font-medium">Sản phẩm</span>
                  <span className="text-muted-foreground text-xs font-medium">Đơn vị tính</span>
                  <span className="text-muted-foreground text-xs font-medium">Số lượng</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    Quy đổi về đơn vị cơ sở
                  </span>
                  <span />
                </div>
                <div className="divide-y overflow-y-auto lg:max-h-96">
                  {fields.map((field, index) => (
                    <InboundRequestLineRow
                      key={field.id}
                      field={field}
                      index={index}
                      lineCount={fields.length}
                      form={form}
                      product={productsById[lines[index]?.productId ?? '']}
                      options={productOptions}
                      conversions={conversionsByProductId[lines[index]?.productId ?? ''] ?? []}
                      units={units}
                      isProductSearchLoading={isProductSearchLoading}
                      isUnitLoading={isUnitLoading}
                      onProductSearchChange={onProductSearchChange}
                      onRemove={onRemoveLine}
                    />
                  ))}
                </div>
              </div>
            </FieldSet>
          </CardContent>
          <CardFooter className="text-muted-foreground text-xs">
            {fields.length} dòng · Số lượng nhập được giữ theo đơn vị đã chọn khi lưu yêu cầu.
          </CardFooter>
        </Card>

        <div className="flex justify-end border-t pt-4">
          <FormActions
            isApprovedEdit={isApprovedEdit}
            isPending={isPending}
            autoApprove={autoApprove}
            onSaveDraft={onSaveDraft}
            onSaveAndSubmit={onSaveAndSubmit}
          />
        </div>
      </form>
    </div>
  )
}
