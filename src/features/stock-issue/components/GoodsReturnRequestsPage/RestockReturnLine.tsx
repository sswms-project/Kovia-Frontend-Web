import type { UseFormReturn } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  GOODS_RETURN_REQUEST_ITEM_CONDITIONS,
  type GoodsReturnRequestItem,
  type GoodsReturnSlotSuggestion,
} from '../../types/stock-issue.types'
import type { RestockReturnFormValues } from '../../schemas/restock-return.schema'
import {
  RETURN_ITEM_CONDITION_LABELS,
  formatStockIssueQuantity,
} from '../../utils/stock-issue-format'
import { ReturnLocationScanField } from './ReturnLocationScanField'

export function RestockReturnLine({
  line,
  index,
  form,
  options,
  disabled,
}: {
  readonly line: GoodsReturnRequestItem
  readonly index: number
  readonly form: UseFormReturn<RestockReturnFormValues>
  readonly options: readonly { condition: string; options: GoodsReturnSlotSuggestion[] }[]
  readonly disabled: boolean
}) {
  const current = form.watch(`items.${index}`)
  const condition = current?.condition ?? line.condition
  const requiresSlot = condition !== 'Scrap'
  const slots = options.find((entry) => entry.condition === condition)?.options ?? []
  const selected = slots.find((slot) => slot.slotId === current?.restockSlotId)
  const errors = form.formState.errors.items?.[index]
  return (
    <article className="flex min-w-0 shrink-0 flex-col gap-4 border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold break-words">{line.productName}</h3>
          <p className="text-muted-foreground font-mono text-sm">{line.sku}</p>
        </div>
        <p className="shrink-0 text-base font-semibold tabular-nums">
          {formatStockIssueQuantity(line.quantity)} {line.unitName}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor={`return-condition-${line.id}`}>Tình trạng thực nhận</FieldLabel>
          <NativeSelect
            id={`return-condition-${line.id}`}
            value={condition}
            className="w-full [&_select]:min-h-11 [&_select]:text-base sm:[&_select]:text-sm"
            disabled={disabled}
            onChange={(event) => {
              const next = GOODS_RETURN_REQUEST_ITEM_CONDITIONS.find(
                (value) => value === event.target.value
              )
              if (!next) return
              const candidates = options.find((entry) => entry.condition === next)?.options ?? []
              const slot = candidates.find((candidate) => candidate.isOriginalSlot) ?? candidates[0]
              form.setValue(`items.${index}.scannedSlotCode`, '', { shouldDirty: true })
              form.setValue(`items.${index}.condition`, next, { shouldDirty: true })
              form.setValue(
                `items.${index}.restockSlotId`,
                next === 'Scrap' ? null : (slot?.slotId ?? null),
                { shouldDirty: true, shouldValidate: true }
              )
            }}
          >
            {GOODS_RETURN_REQUEST_ITEM_CONDITIONS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {RETURN_ITEM_CONDITION_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {condition !== line.condition && (
            <p className="text-muted-foreground text-xs">
              Đã duyệt: {RETURN_ITEM_CONDITION_LABELS[line.condition]}
            </p>
          )}
        </Field>
        {requiresSlot ? (
          <Field>
            <FieldLabel htmlFor={`return-slot-${line.id}`}>Vị trí cất hàng</FieldLabel>
            <NativeSelect
              id={`return-slot-${line.id}`}
              className="w-full [&_select]:min-h-11 [&_select]:text-base sm:[&_select]:text-sm"
              value={current?.restockSlotId ?? ''}
              disabled={disabled || slots.length === 0}
              aria-invalid={Boolean(errors?.restockSlotId)}
              onChange={(event) => {
                form.setValue(`items.${index}.scannedSlotCode`, '', { shouldDirty: true })
                form.setValue(`items.${index}.restockSlotId`, event.target.value || null, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            >
              <NativeSelectOption value="">Chọn vị trí</NativeSelectOption>
              {slots.map((slot) => (
                <NativeSelectOption key={slot.slotId} value={slot.slotId}>
                  {slot.path}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {selected && (
              <p className="text-muted-foreground text-sm break-words">{selected.path}</p>
            )}
            {!disabled && !selected && (
              <p className="text-destructive text-sm">
                {slots.length
                  ? 'Chọn lại vị trí phù hợp trước khi quét.'
                  : condition === 'Good'
                    ? 'Chưa có vị trí đủ điều kiện nhận hàng.'
                    : 'Chưa có điểm cách ly phù hợp. Nhờ quản lý cấu hình Khu vực cách ly.'}
              </p>
            )}
            <FieldError errors={[errors?.restockSlotId]} />
            <ReturnLocationScanField
              key={`${line.id}:${condition}:${selected?.slotId ?? ''}`}
              slot={selected}
              value={current?.scannedSlotCode ?? ''}
              disabled={disabled}
              onConfirm={(code) =>
                form.setValue(`items.${index}.scannedSlotCode`, code, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            <FieldError errors={[errors?.scannedSlotCode]} />
          </Field>
        ) : (
          <p className="text-muted-foreground text-sm">
            Hàng hủy bỏ không nhập tồn và không cần quét vị trí.
          </p>
        )}
      </div>
    </article>
  )
}
