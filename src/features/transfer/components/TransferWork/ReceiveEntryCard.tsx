import { Split, Trash2, MapPin, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PutawayDeviationPanel } from '@/components/operations/putaway'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ReceiptPlanState } from '../../utils/transfer-receive-plan'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { UNREADABLE_SLOT_REASONS } from '@/types/putaway.types'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferReceiptFormValues } from '../../schemas/transfer-fulfillment.schema'
import { TRANSFER_RECEIPT_REASONS } from '../../types/transfer.types'
import { RECEIPT_REASON_LABELS } from '../../utils/transfer-format'
import { ScanInput, type ScanResult } from './ScanInput'

interface ReceiveEntryCardProps {
  readonly index: number
  readonly form: UseFormReturn<TransferReceiptFormValues>
  readonly heading: string
  readonly lotLabel: string
  readonly dispatchedQuantity: number
  readonly baseUnitName: string
  readonly canRemove: boolean
  /** "Khu K01 / Kệ A07" của vị trí đã quét; thiếu thì hiện mã người dùng quét. */
  readonly slotLabel?: string
  /** Vị trí cất gợi ý do người tạo yêu cầu chọn ("Khu K01 / Kệ A07"); chỉ để tham khảo, vẫn phải quét xác nhận. */
  readonly suggestedSlotLabel?: string
  /** Mã vị trí gợi ý, để cảnh báo khi quét sang ô khác (vẫn cho tiếp tục). */
  readonly suggestedSlotId?: string
  readonly disabled: boolean
  readonly isFindingSlot: boolean
  readonly onScanSlot: (index: number, code: string) => ScanResult
  readonly onScanProduct: (index: number, code: string) => ScanResult
  readonly onSplit: (index: number) => void
  readonly onRemove: (index: number) => void
  readonly planState?: ReceiptPlanState
  readonly planChanged?: boolean
  readonly planWarnings?: readonly string[]
  readonly onSplitExcess?: (index: number) => void
  /** Danh sách vị trí kho nhập để chọn khi nhãn không quét được; thiếu thì ẩn lối thoát này. */
  readonly slotOptions?: readonly LookupOption[]
  readonly isLoadingSlots?: boolean
  readonly onSearchSlots?: (value: string) => void
  readonly onMarkUnreadable?: (index: number, option: LookupOption | null) => void
}

const QUANTITY_FIELDS = [
  { name: 'goodQuantity', label: 'Nhận tốt' },
  { name: 'damagedQuantity', label: 'Hỏng' },
  { name: 'missingQuantity', label: 'Thiếu' },
] as const

export function ReceiveEntryCard({
  index,
  form,
  heading,
  lotLabel,
  dispatchedQuantity,
  baseUnitName,
  canRemove,
  slotLabel,
  suggestedSlotLabel,
  suggestedSlotId,
  disabled,
  isFindingSlot,
  onScanSlot,
  onScanProduct,
  onSplit,
  onRemove,
  planState,
  planChanged,
  planWarnings = [],
  onSplitExcess,
  slotOptions = [],
  isLoadingSlots = false,
  onSearchSlots,
  onMarkUnreadable,
}: ReceiveEntryCardProps) {
  const [isUnreadableOpen, setIsUnreadableOpen] = useState(false)
  const errors = form.formState.errors.entries?.[index]
  const entry = form.watch(`entries.${index}`)
  const hasProblem = entry.damagedQuantity > 0 || entry.missingQuantity > 0
  // Khai báo mới (chưa nhập số) vẫn cần ô quét để quét vị trí trước; chỉ ẩn khi khai báo chỉ có hàng thiếu.
  const isMissingOnly =
    entry.goodQuantity <= 0 && entry.damagedQuantity <= 0 && entry.missingQuantity > 0
  const isUnreadable = Boolean(entry.slotCodeUnreadable)
  const isSlotConfirmed = Boolean(entry.destinationSlotId && entry.scannedSlotCode && !isUnreadable)
  const isProductConfirmed = Boolean(entry.scannedProductCode)

  // Máy quét gõ vào ô đang focus nên con trỏ phải tự đi theo từng bước: vị trí → mã hàng → số lượng.
  useEffect(() => {
    if (isSlotConfirmed || isProductConfirmed)
      document.getElementById(`receive-goodQuantity-${index}`)?.focus()
  }, [isSlotConfirmed, isProductConfirmed, index])

  return (
    <article className="bg-card border" aria-label={`Khai báo nhận ${heading} ${lotLabel}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{heading}</p>
          <p className="text-muted-foreground text-xs">{lotLabel}</p>
        </div>
        <p className="text-sm tabular-nums">
          Đã xuất lô này <strong>{formatQuantity(dispatchedQuantity)}</strong> {baseUnitName}
        </p>
      </header>
      <div className="grid gap-4 p-3">
        {planWarnings.map((message) => (
          <p key={message} role="note" className="border-l-warning border border-l-4 p-3 text-sm">
            <TriangleAlert aria-hidden="true" className="text-warning mr-1 inline size-4" />
            {message}
          </p>
        ))}
        {planChanged ? (
          <p role="status" className="text-warning text-sm">
            Kế hoạch dòng này đã thay đổi. Kiểm tra lại vị trí và số lượng đang nhập.
          </p>
        ) : null}
        {!isMissingOnly ? (
          <>
            {suggestedSlotLabel ? (
              <p
                className="bg-primary/10 border-primary/40 flex flex-wrap items-center gap-2 border px-3 py-2.5 text-base"
                role="note"
              >
                <MapPin className="text-primary size-5 shrink-0" aria-hidden="true" />
                <span>Cất vào</span>
                <strong className="font-mono" translate="no">
                  {suggestedSlotLabel}
                </strong>
              </p>
            ) : null}
            <ScanInput
              id={`receive-slot-${index}`}
              autoFocus={index === 0}
              label="Quét mã vị trí cất hàng"
              confirmedValue={isSlotConfirmed ? (slotLabel ?? entry.scannedSlotCode) : undefined}
              hideCamera
              error={errors?.scannedSlotCode?.message ?? null}
              disabled={disabled}
              pending={isFindingSlot}
              onScan={(code) => onScanSlot(index, code)}
            />
            {onMarkUnreadable && !isMissingOnly ? (
              isUnreadableOpen || isUnreadable ? (
                <section
                  aria-label="Không quét được mã vị trí"
                  className="border-l-warning animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 grid gap-3 border border-l-4 p-3 motion-reduce:animate-none"
                >
                  <p className="text-sm">
                    Chọn đúng vị trí đang cất hàng và nêu lý do. Lần nhận này được ghi là chưa xác
                    nhận bằng quét mã và sẽ báo quản lý.
                  </p>
                  <LookupCombobox
                    value={isUnreadable ? entry.destinationSlotId : ''}
                    options={slotOptions}
                    selectedOption={
                      isUnreadable && entry.destinationSlotId
                        ? {
                            value: entry.destinationSlotId,
                            label: slotLabel ?? entry.destinationSlotId,
                          }
                        : undefined
                    }
                    placeholder="Chọn vị trí cất hàng"
                    emptyMessage="Kho nhập chưa có vị trí phù hợp."
                    ariaLabel="Vị trí cất hàng khi không quét được mã"
                    isLoading={isLoadingSlots}
                    isInvalid={Boolean(errors?.scannedSlotCode)}
                    disabled={disabled}
                    onSearchChange={(value) => onSearchSlots?.(value)}
                    onChange={(value, option) =>
                      onMarkUnreadable(index, value ? (option ?? { value, label: value }) : null)
                    }
                  />
                  {isUnreadable && !planState?.isOffPlan ? (
                    <PutawayDeviationPanel
                      reasonCode={entry.deviationReasonCode ?? ''}
                      note={entry.note}
                      disabled={disabled}
                      title="Lý do không quét được mã vị trí"
                      reasons={UNREADABLE_SLOT_REASONS}
                      error={errors?.deviationReasonCode?.message ?? errors?.note?.message ?? null}
                      onReasonChange={(value) =>
                        form.setValue(`entries.${index}.deviationReasonCode`, value, {
                          shouldDirty: true,
                        })
                      }
                      onNoteChange={(value) =>
                        form.setValue(`entries.${index}.note`, value, { shouldDirty: true })
                      }
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    disabled={disabled}
                    onClick={() => {
                      setIsUnreadableOpen(false)
                      onMarkUnreadable(index, null)
                    }}
                  >
                    Quay lại quét mã vị trí
                  </Button>
                </section>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="justify-self-start px-0"
                  disabled={disabled}
                  onClick={() => {
                    setIsUnreadableOpen(true)
                    onSearchSlots?.('')
                  }}
                >
                  Không quét được mã vị trí?
                </Button>
              )
            ) : null}
            {!planState?.isPlanned &&
            suggestedSlotId &&
            entry.destinationSlotId &&
            entry.destinationSlotId !== suggestedSlotId ? (
              <p className="text-warning flex items-center gap-1.5 text-sm" role="status">
                <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />Ô vừa quét khác ô
                quản lý chọn ({suggestedSlotLabel}). Bạn vẫn có thể tiếp tục nếu ô đó phù hợp hơn.
              </p>
            ) : null}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {isProductConfirmed
                    ? `Mã hàng: ${entry.scannedProductCode}`
                    : 'Quét mã hàng (tùy chọn)'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 motion-reduce:animate-none">
                <ScanInput
                  id={`receive-product-${index}`}
                  focusWhen={isSlotConfirmed && !isProductConfirmed}
                  hideCamera
                  label="Quét mã hàng (không bắt buộc)"
                  confirmedValue={entry.scannedProductCode || undefined}
                  error={errors?.scannedProductCode?.message ?? null}
                  disabled={disabled}
                  onScan={(code) => onScanProduct(index, code)}
                />
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : null}
        {planState?.isOffPlan ? (
          <>
            <PutawayDeviationPanel
              reasonCode={entry.deviationReasonCode ?? ''}
              note={entry.note}
              disabled={disabled}
              reasons={isUnreadable ? UNREADABLE_SLOT_REASONS : undefined}
              error={errors?.deviationReasonCode?.message ?? errors?.note?.message ?? null}
              onReasonChange={(value) =>
                form.setValue(`entries.${index}.deviationReasonCode`, value, { shouldDirty: true })
              }
              onNoteChange={(value) =>
                form.setValue(`entries.${index}.note`, value, { shouldDirty: true })
              }
            />
            {planState.withinPlan > 0 && planState.excess > 0 && onSplitExcess ? (
              <div className="border p-3 text-sm">
                <p>
                  Trong kế hoạch {formatQuantity(planState.withinPlan)} · Vượt kế hoạch{' '}
                  {formatQuantity(planState.excess)} {baseUnitName}. Nếu giữ nguyên, cả khai báo này
                  được ghi là cất khác kế hoạch.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={disabled}
                  onClick={() => onSplitExcess(index)}
                >
                  Tách phần vượt kế hoạch
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          {QUANTITY_FIELDS.map((quantityField) => {
            const error = errors?.[quantityField.name]
            const inputId = `receive-${quantityField.name}-${index}`
            return (
              <Field key={quantityField.name} data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={inputId}>{quantityField.label}</FieldLabel>
                <Input
                  id={inputId}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="h-11 text-base tabular-nums"
                  disabled={disabled}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `receive-quantity-error-${index}` : undefined}
                  {...form.register(`entries.${index}.${quantityField.name}`, {
                    valueAsNumber: true,
                  })}
                />
              </Field>
            )
          })}
        </div>
        {errors?.goodQuantity?.message ||
        errors?.damagedQuantity?.message ||
        errors?.missingQuantity?.message ? (
          <FieldError id={`receive-quantity-error-${index}`}>
            {errors.goodQuantity?.message ??
              errors.damagedQuantity?.message ??
              errors.missingQuantity?.message}
          </FieldError>
        ) : null}
        {hasProblem ? (
          <>
            <Field data-invalid={Boolean(errors?.reasonCode)}>
              <FieldLabel htmlFor={`receive-reason-${index}`}>Nguyên nhân hỏng/thiếu</FieldLabel>
              <NativeSelect
                id={`receive-reason-${index}`}
                className="h-11 w-full"
                disabled={disabled}
                {...form.register(`entries.${index}.reasonCode`)}
                aria-invalid={Boolean(errors?.reasonCode)}
                aria-describedby={errors?.reasonCode ? `receive-reason-error-${index}` : undefined}
              >
                <NativeSelectOption value="">Chọn nguyên nhân</NativeSelectOption>
                {TRANSFER_RECEIPT_REASONS.map((reason) => (
                  <NativeSelectOption key={reason} value={reason}>
                    {RECEIPT_REASON_LABELS[reason]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError id={`receive-reason-error-${index}`}>
                {errors?.reasonCode?.message}
              </FieldError>
            </Field>
            {!planState?.isOffPlan ? (
              <Field data-invalid={Boolean(errors?.note)}>
                <FieldLabel htmlFor={`receive-note-${index}`}>Ghi chú</FieldLabel>
                <Textarea
                  id={`receive-note-${index}`}
                  rows={2}
                  maxLength={500}
                  disabled={disabled}
                  {...form.register(`entries.${index}.note`)}
                  aria-invalid={Boolean(errors?.note)}
                  aria-describedby={errors?.note ? `receive-note-error-${index}` : undefined}
                />
                <FieldError id={`receive-note-error-${index}`}>{errors?.note?.message}</FieldError>
              </Field>
            ) : null}
          </>
        ) : null}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t p-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={disabled}
          onClick={() => onSplit(index)}
        >
          <Split aria-hidden="true" />
          Chia sang vị trí khác
        </Button>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={disabled}
            onClick={() => onRemove(index)}
          >
            <Trash2 aria-hidden="true" />
            Bỏ khai báo này
          </Button>
        ) : null}
      </footer>
    </article>
  )
}
