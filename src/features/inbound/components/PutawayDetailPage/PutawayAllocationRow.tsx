'use client'

import { Trash2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { cn } from '@/lib/utils'
import type { PutawayFormValues } from '../../schemas/inbound.schema'
import type {
  getPutawayAllocationState,
  getPutawayFillRemaining,
} from '../../schemas/putaway-allocation.schema'
import type { GoodsReceiptDetail } from '../../types/inbound.types'
import { getPutawayRemainingInput } from '../../utils/putaway-units'
import type { SlotOption } from './PutawayForm'
import { PutawayLocationSelect } from './PutawayLocationSelect'
import { PutawaySlotCodeConfirm } from './PutawaySlotCodeConfirm'

type AllocationState = ReturnType<typeof getPutawayAllocationState>

interface PutawayAllocationRowProps {
  readonly index: number
  readonly receipt: GoodsReceiptDetail
  readonly form: UseFormReturn<PutawayFormValues>
  readonly line: PutawayFormValues['lines'][number]
  readonly row: AllocationState['rows'][number]
  readonly assignedByItem: AllocationState['assignedByItem']
  readonly slots: readonly SlotOption[]
  readonly locked: boolean
  /** Chưa chạm vào dòng thì chưa báo "thiếu vị trí" để form không đỏ ngay khi mở. */
  readonly showRequiredErrors: boolean
  readonly fillRemaining: ReturnType<typeof getPutawayFillRemaining>
  readonly planStatus: 'onPlan' | 'offPlan' | null
  readonly heldWarning: string | undefined
  /** `none`: người xem không đi cất (quản lý); `required`: vị trí do quản lý giao, phải quét mã. */
  readonly scan: 'none' | 'optional' | 'required'
  /** Dòng chưa gắn sản phẩm mới cần chọn sản phẩm; dòng nằm trong nhóm sản phẩm thì không. */
  readonly showProductSelect: boolean
  readonly onRemove: (index: number) => void
}

const CHANGED = { shouldDirty: true, shouldValidate: true } as const

/** Lưới cột dùng chung cho hàng tiêu đề và từng dòng phân bổ trong một nhóm sản phẩm. */
export const PUTAWAY_ROW_GRID =
  'md:grid md:grid-cols-[minmax(0,1fr)_7rem_8rem_minmax(8rem,11rem)_auto] md:items-start md:gap-x-3'

// Nhãn vẫn có cho trình đọc màn hình và màn hẹp; màn rộng đã có hàng tiêu đề cột.
const CELL_LABEL = 'text-xs font-medium md:sr-only'

/** Một vị trí cất trên một hàng: vị trí, số lượng, đơn vị, quy đổi và thao tác. */
export function PutawayAllocationRow({
  index,
  receipt,
  form,
  line,
  row,
  assignedByItem,
  slots,
  locked,
  showRequiredErrors,
  fillRemaining,
  planStatus,
  heldWarning,
  scan,
  showProductSelect,
  onRemove,
}: PutawayAllocationRowProps) {
  const { register, setValue } = form
  const selectedItem = receipt.items.find((item) => item.id === line.goodsReceiptItemId)
  const errors = {
    ...row.errors,
    ...(showRequiredErrors
      ? {}
      : {
          ...(line.slotId ? {} : { slotId: undefined }),
          ...(line.goodsReceiptItemId ? {} : { goodsReceiptItemId: undefined }),
        }),
  }

  return (
    <div className="animate-in fade-in-0 animation-duration-200 px-4 py-2 motion-reduce:animate-none">
      {showProductSelect ? (
        <div className="mb-2 flex flex-col gap-1 md:max-w-md">
          <label htmlFor={`putaway-item-${index}`} className="text-xs font-medium">
            Sản phẩm
          </label>
          <NativeSelect
            id={`putaway-item-${index}`}
            className="w-full"
            disabled={locked}
            aria-invalid={Boolean(errors.goodsReceiptItemId)}
            aria-describedby={`putaway-item-${index}-error`}
            value={line.goodsReceiptItemId}
            onChange={(event) => {
              setValue(`lines.${index}.goodsReceiptItemId`, event.target.value, CHANGED)
              const item = receipt.items.find((candidate) => candidate.id === event.target.value)
              const input = item
                ? getPutawayRemainingInput(item, item.remainingPutAwayQuantity)
                : null
              setValue(`lines.${index}.enteredUnitId`, input?.enteredUnitId ?? '', CHANGED)
              setValue(`lines.${index}.enteredQuantity`, 1, CHANGED)
            }}
          >
            <NativeSelectOption value="">Chọn sản phẩm</NativeSelectOption>
            {receipt.items
              .filter(
                (item) =>
                  item.id === line.goodsReceiptItemId ||
                  (item.inboundRequestItemId &&
                    Math.round(item.remainingPutAwayQuantity * 100) >
                      (assignedByItem.get(item.id) ?? 0))
              )
              .map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.productSKU} - {item.productName}
                  {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          <FieldError id={`putaway-item-${index}-error`}>{errors.goodsReceiptItemId}</FieldError>
        </div>
      ) : null}
      <div className={cn('flex flex-col gap-2', PUTAWAY_ROW_GRID)}>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`putaway-slot-${index}`} className={CELL_LABEL}>
            Cất vào vị trí
          </label>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
            <div className="min-w-0 flex-1">
              <PutawayLocationSelect
                id={`putaway-slot-${index}`}
                invalid={Boolean(errors.slotId)}
                disabled={locked}
                compact
                slots={slots}
                value={line.slotId}
                onChange={(slotId) => {
                  setValue(`lines.${index}.slotId`, slotId, CHANGED)
                  // Mã đã xác nhận thuộc vị trí cũ, không còn giá trị với vị trí mới.
                  setValue(`lines.${index}.confirmedSlotCode`, undefined, { shouldDirty: true })
                }}
              />
            </div>
            {scan === 'none' ? null : (
              <PutawaySlotCodeConfirm
                id={`putaway-slot-code-${index}`}
                required={scan === 'required'}
                slots={slots}
                slotId={line.slotId}
                confirmedCode={line.confirmedSlotCode}
                disabled={locked}
                onConfirm={(slotId, code) => {
                  setValue(`lines.${index}.slotId`, slotId, CHANGED)
                  setValue(`lines.${index}.confirmedSlotCode`, code, { shouldDirty: true })
                }}
                onClear={() =>
                  setValue(`lines.${index}.confirmedSlotCode`, undefined, { shouldDirty: true })
                }
              />
            )}
          </div>
          <FieldError id={`putaway-slot-${index}-error`}>{errors.slotId}</FieldError>
          {heldWarning ? (
            <p className="text-warning text-xs" role="status">
              {heldWarning}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`putaway-quantity-${index}`} className={CELL_LABEL}>
            Số lượng cất
          </label>
          <Input
            id={`putaway-quantity-${index}`}
            type="number"
            className="tabular-nums"
            min={10 ** -(row.unit?.quantityPrecision ?? 0)}
            step={10 ** -(row.unit?.quantityPrecision ?? 0)}
            max={row.maxQuantity}
            disabled={locked}
            aria-invalid={Boolean(errors.enteredQuantity)}
            aria-describedby={`putaway-quantity-${index}-error putaway-conversion-${index}`}
            {...register(`lines.${index}.enteredQuantity`, { valueAsNumber: true })}
          />
          <FieldError id={`putaway-quantity-${index}-error`}>{errors.enteredQuantity}</FieldError>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`putaway-unit-${index}`} className={CELL_LABEL}>
            Đơn vị cất
          </label>
          <NativeSelect
            id={`putaway-unit-${index}`}
            className="w-full"
            disabled={locked || !selectedItem}
            value={line.enteredUnitId}
            aria-invalid={Boolean(errors.enteredUnitId)}
            aria-describedby={`putaway-unit-${index}-error putaway-unit-${index}-description`}
            onChange={(event) => {
              const unitId = event.target.value
              const input =
                selectedItem && row.baseQuantity !== null
                  ? getPutawayRemainingInput(selectedItem, row.baseQuantity, unitId)
                  : null
              setValue(`lines.${index}.enteredUnitId`, unitId, CHANGED)
              setValue(
                `lines.${index}.enteredQuantity`,
                input?.enteredUnitId === unitId ? input.enteredQuantity : Number.NaN,
                CHANGED
              )
            }}
          >
            <NativeSelectOption value="">Chọn đơn vị</NativeSelectOption>
            {(selectedItem?.allowedUnits ?? []).map((unit) => (
              <NativeSelectOption key={unit.unitId} value={unit.unitId}>
                {unit.unitName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError id={`putaway-unit-${index}-error`}>{errors.enteredUnitId}</FieldError>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 text-xs md:pt-2">
          <p
            id={`putaway-conversion-${index}`}
            className="text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {selectedItem && row.baseQuantity !== null
              ? `= ${formatQuantity(row.baseQuantity)} ${selectedItem.baseUnitName}`
              : 'Chọn đơn vị và nhập số lượng để xem quy đổi.'}
          </p>
          {selectedItem && row.unit ? (
            // Quy đổi 1:1 không cần chiếm chỗ nhưng vẫn mô tả cho ô đơn vị.
            <p
              id={`putaway-unit-${index}-description`}
              className={cn(
                'text-muted-foreground break-words',
                row.unit.conversionFactor === 1 && 'sr-only'
              )}
            >
              1 {row.unit.unitName} = {formatQuantity(row.unit.conversionFactor)}{' '}
              {selectedItem.baseUnitName}
            </p>
          ) : null}
          {scan === 'required' && !line.confirmedSlotCode ? (
            <Badge
              variant="outline"
              className="border-warning text-warning animate-in fade-in-0 zoom-in-95 animation-duration-200 w-fit motion-reduce:animate-none"
            >
              Chưa quét mã
            </Badge>
          ) : null}
          {planStatus === 'offPlan' ? (
            <Badge variant="outline" className="border-warning text-warning w-fit">
              Khác kế hoạch
            </Badge>
          ) : planStatus === 'onPlan' ? (
            <Badge variant="secondary" className="w-fit">
              Theo kế hoạch
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked || !fillRemaining}
            aria-label="Cất toàn bộ còn lại"
            title="Điền toàn bộ số lượng còn lại của sản phẩm vào dòng này"
            onClick={() => {
              if (!fillRemaining) return
              setValue(`lines.${index}.enteredUnitId`, fillRemaining.enteredUnitId, CHANGED)
              setValue(`lines.${index}.enteredQuantity`, fillRemaining.enteredQuantity, CHANGED)
            }}
          >
            Còn lại
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={locked}
            aria-label={`Xóa phân bổ ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
