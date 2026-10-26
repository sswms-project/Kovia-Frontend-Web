'use client'

import { ArrowLeft, Plus, Save, UserPlus } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  BusinessCodeField,
  type BusinessCodeFieldProps,
} from '@/components/forms/BusinessCodeField'
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
import { Textarea } from '@/components/ui/textarea'
import {
  DatePickerField,
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage'
import { cn } from '@/lib/utils'
import type { CreateStockIssueRequestFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueProductOption } from '../../types/stock-issue.types'
import { StockIssueAttachmentPicker } from './StockIssueAttachmentPicker'
import { STOCK_ISSUE_LINE_GRID_CLASS, StockIssueRequestLineRow } from './StockIssueRequestLineRow'

export interface StockIssueRecipientSnapshot {
  readonly recipientName: string
  readonly phone: string
  readonly address: string
}

interface StockIssueRequestFormProps {
  readonly title: string
  readonly isEditing: boolean
  readonly form: UseFormReturn<CreateStockIssueRequestFormValues>
  readonly fields: readonly FieldArrayWithId<CreateStockIssueRequestFormValues, 'lines', 'id'>[]
  readonly warehouseOptions: readonly LookupOption[]
  readonly selectedWarehouseOption?: LookupOption
  readonly recipientOptions: readonly LookupOption[]
  readonly selectedRecipientOption?: LookupOption
  readonly recipientSnapshot?: StockIssueRecipientSnapshot
  readonly productOptions: readonly LookupOption[]
  readonly selectedProductOptions: Readonly<Record<string, LookupOption>>
  readonly productsById: Readonly<Record<string, StockIssueProductOption>>
  readonly attachments: readonly File[]
  readonly isWarehouseSearchLoading: boolean
  readonly isRecipientSearchLoading: boolean
  readonly isProductSearchLoading: boolean
  readonly isPending: boolean
  readonly codeSuggestionStatus?: BusinessCodeFieldProps['suggestionStatus']
  readonly onCodeChange?: () => void
  readonly onWarehouseSearchChange: (value: string) => void
  readonly onRecipientSearchChange: (value: string) => void
  readonly onProductSearchChange: (scope: string, value: string) => void
  readonly onProductSelect: (option?: LookupOption) => void
  readonly onRecipientSelect: (option?: LookupOption) => void
  readonly onWarehouseSelect: (option?: LookupOption) => void
  readonly onQuickCreateRecipient: () => void
  readonly onAddLine: () => void
  readonly onRemoveLine: (index: number) => void
  readonly onAddAttachments: (files: FileList) => void
  readonly onRemoveAttachment: (index: number) => void
  readonly onCancel: () => void
  readonly onSave: () => void
  readonly onSaveAndAddAnother: () => void
}

export function StockIssueRequestForm({
  title,
  isEditing,
  form,
  fields,
  warehouseOptions,
  selectedWarehouseOption,
  recipientOptions,
  selectedRecipientOption,
  recipientSnapshot,
  productOptions,
  selectedProductOptions,
  productsById,
  attachments,
  isWarehouseSearchLoading,
  isRecipientSearchLoading,
  isProductSearchLoading,
  isPending,
  codeSuggestionStatus,
  onCodeChange,
  onWarehouseSearchChange,
  onRecipientSearchChange,
  onProductSearchChange,
  onProductSelect,
  onRecipientSelect,
  onWarehouseSelect,
  onQuickCreateRecipient,
  onAddLine,
  onRemoveLine,
  onAddAttachments,
  onRemoveAttachment,
  onCancel,
  onSave,
  onSaveAndAddAnother,
}: StockIssueRequestFormProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const lines = watch('lines')

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
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
          <span className="text-muted-foreground shrink-0 text-xs">Xuất kho / Yêu cầu</span>
          <span className="text-muted-foreground text-xs">›</span>
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
      </header>

      <form
        data-scrollbar="slim"
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 pb-3 [&>*]:shrink-0"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <Card className="border-foreground border ring-0">
          <CardHeader>
            <CardTitle>Thông tin xuất kho</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <BusinessCodeField
                  label="Mã yêu cầu xuất kho"
                  error={errors.stockIssueRequestCode}
                  suggestionStatus={codeSuggestionStatus}
                  description={
                    isEditing
                      ? 'Mã yêu cầu không đổi sau khi đã tạo.'
                      : 'Mã được gợi ý, có thể chỉnh sửa. Để trống thì hệ thống tự cấp.'
                  }
                  inputProps={{
                    ...register('stockIssueRequestCode', { onChange: onCodeChange }),
                    id: 'stock-issue-request-code',
                    maxLength: 100,
                    readOnly: isEditing,
                    disabled: isPending,
                    className: 'font-mono',
                  }}
                />
                <Field data-invalid={Boolean(errors.warehouseId)}>
                  <FieldLabel htmlFor="stock-issue-warehouse">Kho xuất hàng</FieldLabel>
                  <LookupCombobox
                    id="stock-issue-warehouse"
                    value={watch('warehouseId')}
                    options={warehouseOptions}
                    selectedOption={selectedWarehouseOption}
                    placeholder="Chọn hoặc tìm kho"
                    emptyMessage="Không tìm thấy kho phù hợp."
                    ariaLabel="Kho xuất hàng"
                    isLoading={isWarehouseSearchLoading}
                    isInvalid={Boolean(errors.warehouseId)}
                    disabled={isPending}
                    onSearchChange={onWarehouseSearchChange}
                    onChange={(value, option) => {
                      setValue('warehouseId', value, { shouldDirty: true, shouldValidate: true })
                      onWarehouseSelect(option)
                    }}
                  />
                  <FieldDescription>
                    Vị trí và lô lấy hàng được hệ thống giữ khi giao việc lấy hàng.
                  </FieldDescription>
                  <FieldError>{errors.warehouseId?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.stockRecipientId)}>
                  <FieldLabel htmlFor="stock-issue-recipient">Đơn vị nhận hàng</FieldLabel>
                  <LookupCombobox
                    id="stock-issue-recipient"
                    value={watch('stockRecipientId')}
                    options={recipientOptions}
                    selectedOption={selectedRecipientOption}
                    placeholder="Tìm mã, tên hoặc số điện thoại"
                    emptyMessage="Không tìm thấy đơn vị nhận hàng phù hợp."
                    ariaLabel="Đơn vị nhận hàng"
                    isLoading={isRecipientSearchLoading}
                    isInvalid={Boolean(errors.stockRecipientId)}
                    disabled={isPending}
                    onSearchChange={onRecipientSearchChange}
                    onChange={(value, option) => {
                      setValue('stockRecipientId', value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                      onRecipientSelect(option)
                    }}
                    footerAction={{
                      label: 'Thêm nhanh đơn vị nhận hàng',
                      icon: <UserPlus aria-hidden="true" />,
                      onClick: onQuickCreateRecipient,
                    }}
                  />
                  <FieldError>{errors.stockRecipientId?.message}</FieldError>
                </Field>
                <DatePickerField
                  id="stock-issue-date"
                  label="Ngày xuất"
                  withTime
                  error={errors.issueDate?.message}
                  value={watch('issueDate')}
                  onChange={(value) =>
                    setValue('issueDate', value, { shouldDirty: true, shouldValidate: true })
                  }
                />
                <Field data-invalid={Boolean(errors.referenceCode)}>
                  <FieldLabel htmlFor="stock-issue-reference">
                    Mã chứng từ tham chiếu (tùy chọn)
                  </FieldLabel>
                  <Input
                    id="stock-issue-reference"
                    maxLength={100}
                    placeholder="Số chứng từ, hợp đồng, đơn bán…"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.referenceCode)}
                    {...register('referenceCode')}
                  />
                  <FieldError>{errors.referenceCode?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.purpose)} className="sm:col-span-2">
                  <FieldLabel htmlFor="stock-issue-purpose">
                    Diễn giải / mục đích (tùy chọn)
                  </FieldLabel>
                  <Input
                    id="stock-issue-purpose"
                    maxLength={500}
                    placeholder="VD: Xuất bán theo đơn hàng tháng 10"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.purpose)}
                    {...register('purpose')}
                  />
                  <FieldError>{errors.purpose?.message}</FieldError>
                </Field>
                {recipientSnapshot ? (
                  <dl className="bg-muted/40 grid gap-x-4 gap-y-2 border p-3 text-xs sm:col-span-2 sm:grid-cols-3 lg:col-span-3">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Người nhận</dt>
                      <dd className="font-medium break-words">{recipientSnapshot.recipientName}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Số điện thoại</dt>
                      <dd className="font-medium break-words">{recipientSnapshot.phone}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Địa chỉ giao</dt>
                      <dd className="font-medium break-words">{recipientSnapshot.address}</dd>
                    </div>
                  </dl>
                ) : null}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card className="border-foreground border ring-0">
          <CardHeader>
            <CardTitle>Sản phẩm xuất kho</CardTitle>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onAddLine}
              >
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
              <div className="border">
                <div
                  className={cn(
                    'bg-card sticky top-0 z-10 hidden border-b px-3 py-2 lg:grid lg:items-center lg:gap-3',
                    STOCK_ISSUE_LINE_GRID_CLASS
                  )}
                >
                  <span className="text-muted-foreground text-center text-xs font-medium">#</span>
                  <span className="text-muted-foreground text-xs font-medium">Sản phẩm</span>
                  <span className="text-muted-foreground text-xs font-medium">Đơn vị</span>
                  <span className="text-muted-foreground text-xs font-medium">Số lượng</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    Quy đổi và tồn kho
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">Ghi chú</span>
                  <span />
                </div>
                <div className="divide-y overflow-y-auto lg:max-h-96">
                  {fields.map((field, index) => {
                    const productId = lines[index]?.productId ?? ''
                    return (
                      <StockIssueRequestLineRow
                        key={field.id}
                        field={field}
                        index={index}
                        lineCount={fields.length}
                        form={form}
                        options={productOptions}
                        selectedOption={selectedProductOptions[productId]}
                        product={productsById[productId]}
                        hasWarehouse={Boolean(watch('warehouseId'))}
                        isProductSearchLoading={isProductSearchLoading}
                        isPending={isPending}
                        onProductSearchChange={onProductSearchChange}
                        onProductSelect={onProductSelect}
                        onRemove={onRemoveLine}
                      />
                    )
                  })}
                </div>
              </div>
            </FieldSet>
          </CardContent>
          <CardFooter className="text-muted-foreground text-xs">
            {fields.length} dòng · Chỉ hiện sản phẩm còn tồn khả dụng tại kho xuất. Tồn kho chỉ được
            giữ khi phiếu được giao việc lấy hàng, theo nguyên kiện.
          </CardFooter>
        </Card>

        <Card className="border-foreground border ring-0">
          <CardHeader>
            <CardTitle>Ghi chú{isEditing ? '' : ' và đính kèm'}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.note)}>
                <FieldLabel htmlFor="stock-issue-note">Ghi chú chung (tùy chọn)</FieldLabel>
                <Textarea
                  id="stock-issue-note"
                  rows={2}
                  maxLength={1000}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.note)}
                  {...register('note')}
                />
                <FieldError>{errors.note?.message}</FieldError>
              </Field>
              {isEditing ? (
                <p className="text-muted-foreground text-xs">
                  Tệp đính kèm của phiếu đã lưu được quản lý ở trang chi tiết.
                </p>
              ) : (
                <StockIssueAttachmentPicker
                  files={attachments}
                  isPending={isPending}
                  onAdd={onAddAttachments}
                  onRemove={onRemoveAttachment}
                />
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
          <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
            Hủy
          </Button>
          {isEditing ? null : (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onSaveAndAddAnother}
            >
              <Plus aria-hidden="true" />
              Lưu và tạo phiếu khác
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save aria-hidden="true" />
            {isPending ? 'Đang lưu…' : isEditing ? 'Lưu thay đổi' : 'Tạo yêu cầu xuất kho'}
          </Button>
        </div>
      </form>
    </div>
  )
}
