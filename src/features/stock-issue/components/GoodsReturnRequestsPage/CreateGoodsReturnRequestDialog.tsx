'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import type { CreateGoodsReturnRequestFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import type { GoodsReturnLineSuggestion } from '../../types/stock-issue.types'
import {
  describeSlotSuggestion,
  formatSlotSuggestionLabel,
} from '../../utils/goods-return-suggestion'

export function CreateGoodsReturnRequestDialog({
  isEditing = false,
  order,
  form,
  isPending,
  slotOptions,
  suggestionsByPickDetail,
  allowableByPickDetail,
  slotSearch,
  onSlotSearchChange,
  onOpenChange,
  onSubmit,
}: {
  readonly isEditing?: boolean
  readonly order: StockIssueRequestSummary | null
  readonly form: UseFormReturn<CreateGoodsReturnRequestFormValues>
  readonly isPending: boolean
  readonly slotOptions: readonly { id: string; label: string }[]
  readonly suggestionsByPickDetail: Readonly<Record<string, GoodsReturnLineSuggestion>>
  readonly allowableByPickDetail: Readonly<Record<string, number>>
  readonly slotSearch: string
  readonly onSlotSearchChange: (value: string) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CreateGoodsReturnRequestFormValues) => Promise<void>
}) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] min-w-0 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa nháp khách trả hàng' : 'Tạo yêu cầu trả hàng'}
          </DialogTitle>
          <DialogDescription>
            Số lượng tối đa đã trừ các yêu cầu trả hàng chưa bị từ chối.
          </DialogDescription>
        </DialogHeader>
        {order ? (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.reason)}>
                <FieldLabel htmlFor="return-reason">Lý do</FieldLabel>
                <Textarea
                  id="return-reason"
                  aria-invalid={Boolean(form.formState.errors.reason)}
                  {...form.register('reason')}
                />
                <FieldError errors={[form.formState.errors.reason]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="return-slot-search">Tìm vị trí nhập lại</FieldLabel>
                <Input
                  id="return-slot-search"
                  name="returnSlotSearch"
                  autoComplete="off"
                  placeholder="Tìm mã vị trí…"
                  value={slotSearch}
                  onChange={(event) => onSlotSearchChange(event.target.value)}
                />
              </Field>
              {form.watch('lines').map((line, index) => (
                <FieldGroup
                  key={line.stockIssuePickDetailId}
                  className="grid min-w-0 gap-3 border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,2fr)]"
                >
                  <div>
                    <p className="text-sm font-medium">{line.productName}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {line.lotNumber ? `Lô ${line.lotNumber}` : 'Theo số lượng'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Có thể trả: {allowableByPickDetail[line.stockIssuePickDetailId] ?? 0}
                    </p>
                    {isEditing && line.quantity > line.returnableQuantity ? (
                      <p className="text-destructive text-xs" role="status">
                        Dòng đã lưu hiện vượt lượng còn được trả. Giảm số lượng hoặc nhập 0 để bỏ
                        dòng.
                      </p>
                    ) : null}
                  </div>
                  <Field data-invalid={Boolean(form.formState.errors.lines?.[index]?.quantity)}>
                    <FieldLabel htmlFor={`return-quantity-${index}`}>Số lượng</FieldLabel>
                    <Input
                      id={`return-quantity-${index}`}
                      aria-invalid={Boolean(form.formState.errors.lines?.[index]?.quantity)}
                      type="number"
                      min={0}
                      step="0.01"
                      max={allowableByPickDetail[line.stockIssuePickDetailId] ?? 0}
                      {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <FieldError errors={[form.formState.errors.lines?.[index]?.quantity]} />
                  </Field>
                  <FieldGroup className="min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
                    <Field>
                      <FieldLabel htmlFor={`return-condition-${index}`}>Tình trạng</FieldLabel>
                      <NativeSelect
                        id={`return-condition-${index}`}
                        {...form.register(`lines.${index}.condition`)}
                      >
                        <NativeSelectOption value="Good">Còn tốt</NativeSelectOption>
                        <NativeSelectOption value="Damaged">Hư hỏng</NativeSelectOption>
                        <NativeSelectOption value="Expired">Hết hạn</NativeSelectOption>
                        <NativeSelectOption value="Scrap">Hủy bỏ</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    {line.condition !== 'Scrap' ? (
                      <Field
                        data-invalid={Boolean(form.formState.errors.lines?.[index]?.restockSlotId)}
                      >
                        <FieldLabel htmlFor={`return-slot-${index}`}>Vị trí nhập lại</FieldLabel>
                        <NativeSelect
                          id={`return-slot-${index}`}
                          aria-invalid={Boolean(
                            form.formState.errors.lines?.[index]?.restockSlotId
                          )}
                          {...form.register(`lines.${index}.restockSlotId`)}
                        >
                          <NativeSelectOption value="">Chọn vị trí nhập lại</NativeSelectOption>
                          {(
                            suggestionsByPickDetail[line.stockIssuePickDetailId]?.suggestions ?? []
                          ).map((suggestion) => (
                            <NativeSelectOption key={suggestion.slotId} value={suggestion.slotId}>
                              {formatSlotSuggestionLabel(suggestion)}
                            </NativeSelectOption>
                          ))}
                          {slotOptions
                            .filter(
                              (slot) =>
                                !suggestionsByPickDetail[
                                  line.stockIssuePickDetailId
                                ]?.suggestions.some((suggestion) => suggestion.slotId === slot.id)
                            )
                            .map((slot) => (
                              <NativeSelectOption key={slot.id} value={slot.id}>
                                {slot.label}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        <p className="text-muted-foreground text-xs">
                          {describeSlotSuggestion(
                            suggestionsByPickDetail[line.stockIssuePickDetailId],
                            form.watch(`lines.${index}.restockSlotId`)
                          )}
                        </p>
                        <FieldError
                          errors={[form.formState.errors.lines?.[index]?.restockSlotId]}
                        />
                      </Field>
                    ) : null}
                  </FieldGroup>
                </FieldGroup>
              ))}
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                {isEditing ? 'Lưu nháp' : 'Tạo yêu cầu trả hàng'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
