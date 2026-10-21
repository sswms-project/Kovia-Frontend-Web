import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { MapPin, MapPinned, Split, Trash2 } from 'lucide-react'
import { PutawayDeviationPanel } from '@/components/operations/putaway'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, FieldError, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { UNREADABLE_SLOT_REASONS } from '@/types/putaway.types'
import type { TransferPutAwayFormValues } from '../../schemas/transfer-putaway.schema'
import { parseTransferQuantityInput } from '../../schemas/transfer-receipt.schema'
import type { TransferPutAwaySheetRow } from '../../types/transfer-receipt.types'
import type { ReceiptPlanState } from '../../utils/transfer-receive-plan'
import { ScanInput } from './ScanInput'
import { CameraScanPanel } from './CameraScanPanel'

interface Props {
  readonly index: number
  readonly hideHeader?: boolean
  readonly row: TransferPutAwaySheetRow
  readonly form: UseFormReturn<TransferPutAwayFormValues>
  readonly disabled: boolean
  readonly pendingScan: boolean
  readonly cameraTarget: 'slot' | 'product' | null
  readonly onCameraTargetChange: (target: 'slot' | 'product' | null) => void
  readonly planState?: ReceiptPlanState
  readonly planChanged: boolean
  readonly canRemove: boolean
  readonly slotOptions: readonly LookupOption[]
  readonly loadingSlots: boolean
  readonly onSearchSlots: (search: string) => void
  readonly onMarkUnreadable: (index: number, option: LookupOption | null) => void
  readonly onChangeSlot: (index: number, option: LookupOption | null) => void
  readonly onOpenMap?: (index: number) => void
  readonly onScanSlot: (index: number, code: string) => Promise<boolean>
  readonly onScanProduct: (index: number, code: string) => boolean
  readonly onSplit: (index: number) => void
  readonly onSplitExcess: (index: number) => void
  readonly onRemove: (index: number) => void
}

export function TransferPutAwayEntryCard({
  index,
  hideHeader = false,
  row,
  form,
  disabled,
  pendingScan,
  cameraTarget,
  onCameraTargetChange,
  planState,
  planChanged,
  canRemove,
  slotOptions,
  loadingSlots,
  onSearchSlots,
  onMarkUnreadable,
  onChangeSlot,
  onOpenMap,
  onScanSlot,
  onScanProduct,
  onSplit,
  onSplitExcess,
  onRemove,
}: Props) {
  const entry = form.watch(`entries.${index}`)
  const errors = form.formState.errors.entries?.[index]
  const [unreadableOpen, setUnreadableOpen] = useState(false)
  if (!entry) return null
  const manual = entry.slotCodeUnreadable
  const confirmed = Boolean(entry.destinationSlotId && entry.scannedSlotCode && !manual)
  const quantityId = `putaway-quantity-${index}`
  async function scanSlot(code: string) {
    if (disabled || pendingScan) return false
    const quantityInput = document.getElementById(quantityId)
    // One lookup per explicit scan; restarting a continuous reader would re-read a held bad code.
    onCameraTargetChange(null)
    const done = await onScanSlot(index, code)
    if (done) {
      window.requestAnimationFrame(() => {
        if (quantityInput?.isConnected) quantityInput.focus()
      })
    }
    return done
  }
  return (
    <article
      className="bg-card border"
      aria-label={'Cất ' + row.sku + ' · ' + (row.lotNumber ?? 'Không theo lô')}
    >
      {!hideHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b p-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold break-words">
              {row.sku} · {row.productName}
            </h2>
            <p className="text-muted-foreground text-xs">
              {row.lotNumber ? 'Lô ' + row.lotNumber : 'Không theo lô'} · {row.baseUnitName}
            </p>
          </div>
          <Badge variant={row.qualityStatus === 'Good' ? 'secondary' : 'outline'}>
            {row.qualityStatus === 'Good' ? 'Hàng tốt' : 'Hàng hỏng'}
          </Badge>
          <p className="w-full text-xs tabular-nums">
            Thực nhận {formatQuantity(row.actualQuantity)} · Đã cất{' '}
            {formatQuantity(row.putAwayQuantity)} · Còn {formatQuantity(row.remainingQuantity)}
          </p>
        </header>
      ) : null}
      <FieldGroup className="gap-3 p-3">
        {!manual ? (
          <CameraScanPanel
            label="Quét mã vị trí cất hàng"
            open={cameraTarget === 'slot'}
            disabled={disabled || pendingScan}
            onOpenChange={(open) => onCameraTargetChange(open ? 'slot' : null)}
            onCode={scanSlot}
          />
        ) : null}
        {planChanged ? (
          <p className="text-warning text-sm" role="status">
            Kế hoạch hoặc số còn lại của dòng này đã đổi. Kiểm tra trước khi xác nhận.
          </p>
        ) : null}
        {entry.plannedSlotLabel ? (
          <p className="text-primary flex flex-wrap items-center gap-2 text-sm">
            <MapPin aria-hidden="true" />
            Theo kế hoạch: <strong>{entry.plannedSlotLabel}</strong>
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {entry.destinationSlotId
              ? 'Vị trí đề xuất đã được điền. Có thể chỉnh lại trước khi quét.'
              : 'Chưa tìm được vị trí đủ điều kiện. Chọn vị trí khác hoặc kiểm tra cấu hình sức chứa.'}
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
          <Field data-invalid={Boolean(errors?.destinationSlotId)}>
            <FieldLabel htmlFor={`putaway-location-${index}`}>Vị trí cất</FieldLabel>
            <LookupCombobox
              id={`putaway-location-${index}`}
              value={entry.destinationSlotId}
              options={slotOptions}
              selectedOption={
                entry.destinationSlotId
                  ? {
                      value: entry.destinationSlotId,
                      label: entry.slotLabel || entry.destinationSlotId,
                    }
                  : undefined
              }
              ariaLabel="Vị trí cất hàng"
              placeholder="Chọn vị trí cất hàng"
              emptyMessage="Không tìm thấy vị trí nhận hàng."
              disabled={disabled}
              isLoading={loadingSlots}
              isInvalid={Boolean(errors?.destinationSlotId)}
              onSearchChange={onSearchSlots}
              onChange={(value, option) =>
                onChangeSlot(index, value ? (option ?? { value, label: value }) : null)
              }
              footerAction={
                onOpenMap
                  ? {
                      label: 'Chọn trên sơ đồ kho',
                      icon: <MapPinned />,
                      onClick: () => {
                        if (!disabled) onOpenMap(index)
                      },
                    }
                  : undefined
              }
            />
            <FieldError>{errors?.destinationSlotId?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors?.quantity)}>
            <FieldLabel htmlFor={quantityId}>Số lượng cất ({row.baseUnitName})</FieldLabel>
            <Input
              id={quantityId}
              className="h-11 text-base md:h-8 md:text-xs pointer-coarse:h-11"
              type="text"
              inputMode={row.baseQuantityPrecision === 0 ? 'numeric' : 'decimal'}
              disabled={disabled}
              aria-invalid={Boolean(errors?.quantity)}
              aria-describedby={errors?.quantity ? `${quantityId}-error` : undefined}
              {...form.register(`entries.${index}.quantity`, {
                setValueAs: parseTransferQuantityInput,
              })}
            />
            <FieldError id={`${quantityId}-error`}>{errors?.quantity?.message}</FieldError>
          </Field>
        </div>
        {!manual ? (
          <ScanInput
            id={`putaway-slot-${index}`}
            label="Quét mã vị trí cất hàng"
            confirmedValue={confirmed ? entry.slotLabel || entry.scannedSlotCode : undefined}
            error={errors?.scannedSlotCode?.message ?? errors?.destinationSlotId?.message ?? null}
            disabled={disabled}
            pending={pendingScan}
            hideCamera
            onScan={scanSlot}
          />
        ) : null}
        {unreadableOpen || manual ? (
          <FieldGroup className="gap-3 border p-3">
            <Field data-invalid={Boolean(errors?.destinationSlotId)}>
              <FieldLabel>Vị trí khi không quét được mã</FieldLabel>
              <LookupCombobox
                value={manual ? entry.destinationSlotId : ''}
                options={slotOptions}
                isInvalid={Boolean(errors?.destinationSlotId)}
                selectedOption={
                  manual && entry.destinationSlotId
                    ? {
                        value: entry.destinationSlotId,
                        label: entry.slotLabel || entry.destinationSlotId,
                      }
                    : undefined
                }
                ariaLabel="Vị trí cất hàng khi không quét được mã"
                placeholder="Chọn vị trí cất hàng"
                emptyMessage="Không tìm thấy vị trí phù hợp."
                disabled={disabled}
                isLoading={loadingSlots}
                onSearchChange={onSearchSlots}
                onChange={(value, option) =>
                  onMarkUnreadable(index, value ? (option ?? { value, label: value }) : null)
                }
              />
              <FieldError>{errors?.destinationSlotId?.message}</FieldError>
            </Field>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={() => {
                setUnreadableOpen(false)
                onMarkUnreadable(index, null)
              }}
            >
              Quay lại quét mã vị trí
            </Button>
          </FieldGroup>
        ) : (
          <Button
            variant="link"
            size="sm"
            type="button"
            disabled={disabled}
            className="justify-self-start px-0"
            onClick={() => {
              onCameraTargetChange(null)
              setUnreadableOpen(true)
              onSearchSlots('')
            }}
          >
            Không quét được mã vị trí?
          </Button>
        )}
        <Collapsible
          onOpenChange={(open) => {
            if (!open) onCameraTargetChange(null)
          }}
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" type="button" size="sm">
              Quét mã hàng (tùy chọn)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 motion-reduce:animate-none">
            <CameraScanPanel
              label="Quét mã hàng (không bắt buộc)"
              open={cameraTarget === 'product'}
              disabled={disabled || pendingScan}
              onOpenChange={(open) => onCameraTargetChange(open ? 'product' : null)}
              onCode={(code) => {
                if (disabled || pendingScan) return false
                const done = onScanProduct(index, code)
                if (done) onCameraTargetChange(null)
                return done
              }}
            />
            <ScanInput
              id={`putaway-product-${index}`}
              label="Quét mã hàng (không bắt buộc)"
              disabled={disabled}
              hideCamera
              confirmedValue={entry.scannedProductCode || undefined}
              error={errors?.scannedProductCode?.message ?? null}
              onScan={(code) => onScanProduct(index, code)}
            />
          </CollapsibleContent>
        </Collapsible>
        {manual || planState?.isOffPlan ? (
          <PutawayDeviationPanel
            disabled={disabled}
            reasonCode={entry.deviationReasonCode}
            note={entry.note}
            title={manual ? 'Lý do không quét được mã vị trí' : 'Lý do cất khác kế hoạch'}
            reasons={manual ? UNREADABLE_SLOT_REASONS : undefined}
            error={errors?.deviationReasonCode?.message ?? errors?.note?.message ?? null}
            onReasonChange={(value) =>
              form.setValue(`entries.${index}.deviationReasonCode`, value, { shouldDirty: true })
            }
            onNoteChange={(value) =>
              form.setValue(`entries.${index}.note`, value, { shouldDirty: true })
            }
          />
        ) : null}
        {planState?.isOffPlan && planState.withinPlan > 0 && planState.excess > 0 ? (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              Trong kế hoạch {formatQuantity(planState.withinPlan)} · Vượt{' '}
              {formatQuantity(planState.excess)}. Nếu giữ nguyên, cả khai báo này được ghi là khác
              kế hoạch.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onSplitExcess(index)}
            >
              Tách phần vượt kế hoạch
            </Button>
          </div>
        ) : null}
      </FieldGroup>
      <footer className="grid gap-2 border-t p-3 sm:flex sm:flex-wrap">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => onSplit(index)}>
          <Split aria-hidden="true" />
          Chia sang vị trí khác
        </Button>
        {canRemove ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => onRemove(index)}>
            <Trash2 aria-hidden="true" />
            Bỏ khai báo này
          </Button>
        ) : null}
      </footer>
    </article>
  )
}
