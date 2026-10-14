'use client'

import { useId, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { SlotOption } from '@/features/inbound/components/PutawayDetailPage'
import { PUTAWAY_ROW_GRID } from '@/features/inbound/components/PutawayDetailPage/PutawayAllocationRow'
import { PutawayLocationSelect } from '@/features/inbound/components/PutawayDetailPage/PutawayLocationSelect'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { cn } from '@/lib/utils'
import type { TransferItem } from '../../types/transfer.types'
import {
  planTotalFromRemaining,
  type TransferPlanDraftItem,
} from '../../utils/transfer-putaway-plan'

interface Props {
  readonly item: TransferItem
  readonly line: TransferPlanDraftItem['lines'][number]
  readonly received: number
  readonly remaining: number
  readonly slots: readonly SlotOption[]
  readonly disabled: boolean
  readonly loading: boolean
  readonly slotError?: string
  readonly quantityError?: string
  readonly onChange: (change: Partial<TransferPlanDraftItem['lines'][number]>) => void
  readonly onSearch: (text: string) => void
  readonly onOpenMap: () => void
  readonly onRemove: () => void
}

export function TransferPlanAllocationRow({
  item,
  line,
  received,
  remaining,
  slots,
  disabled,
  loading,
  slotError,
  quantityError,
  onChange,
  onSearch,
  onOpenMap,
  onRemove,
}: Props) {
  const id = useId()
  const [selectedUnitId, setSelectedUnitId] = useState(() =>
    item.unitId &&
    item.conversionFactor > 0 &&
    Number.isInteger((line.plannedTotal - received) / item.conversionFactor)
      ? item.unitId
      : (item.baseUnitId ?? '')
  )
  // Chỉ dùng ĐVT chính và quy đổi đã chụp trên phiếu, không suy đoán hệ số.
  const units = [
    { id: item.baseUnitId ?? '', name: item.baseUnitName ?? 'Đơn vị chính', factor: 1 },
  ]
  if (item.unitId && item.unitId !== item.baseUnitId && item.conversionFactor > 0)
    units.push({
      id: item.unitId,
      name: item.unitName ?? 'Đơn vị điều chuyển',
      factor: item.conversionFactor,
    })
  const unit = units.find((unit) => unit.id === selectedUnitId) ?? units[0]!
  const quantity = Number.isFinite(line.plannedTotal)
    ? Number(((line.plannedTotal - received) / unit.factor).toPrecision(15))
    : ''
  return (
    <div className="animate-in fade-in-0 animation-duration-200 px-4 py-2 motion-reduce:animate-none">
      <div className={cn('grid grid-cols-1 gap-3', PUTAWAY_ROW_GRID)}>
        <Field data-invalid={Boolean(slotError)} className="min-w-0 gap-1">
          <FieldLabel htmlFor={`${id}-slot`} className="text-xs font-medium md:sr-only">
            Cất vào vị trí
          </FieldLabel>
          <div className="relative min-w-0">
            <PutawayLocationSelect
              id={`${id}-slot`}
              value={line.slotId}
              slots={slots}
              invalid={Boolean(slotError)}
              disabled={disabled || received > 0 || loading}
              compact
              onOpenMap={
                received === 0
                  ? () => {
                      onSearch('')
                      onOpenMap()
                    }
                  : undefined
              }
              onChange={(slotId) => {
                const slot = slots.find((slot) => slot.id === slotId)
                if (slot) onChange({ slotId, path: `${slot.hierarchy} / ${slot.code}` })
              }}
            />
          </div>
          <FieldError id={`${id}-slot-error`}>{slotError}</FieldError>
          {received > 0 ? (
            <p className="text-muted-foreground text-xs">
              Đã cất {formatQuantity(received)} {item.baseUnitName} · vị trí được khóa
            </p>
          ) : null}
        </Field>
        <Field data-invalid={Boolean(quantityError)} className="min-w-0 gap-1">
          <FieldLabel htmlFor={`${id}-quantity`} className="text-xs font-medium md:sr-only">
            Số lượng cất
          </FieldLabel>
          <Input
            id={`${id}-quantity`}
            type="number"
            className="tabular-nums"
            inputMode="decimal"
            value={quantity}
            min={0}
            step="any"
            disabled={disabled}
            aria-invalid={Boolean(quantityError)}
            aria-describedby={quantityError ? `${id}-quantity-error` : `${id}-conversion`}
            onChange={(event) =>
              onChange({
                plannedTotal:
                  event.target.value === ''
                    ? Number.NaN
                    : planTotalFromRemaining(
                        received,
                        Number((event.target.valueAsNumber * unit.factor).toPrecision(15))
                      ),
              })
            }
          />
          <FieldError id={`${id}-quantity-error`}>{quantityError}</FieldError>
        </Field>
        <Field className="min-w-0 gap-1">
          <FieldLabel htmlFor={`${id}-unit`} className="text-xs font-medium md:sr-only">
            Đơn vị cất
          </FieldLabel>
          <NativeSelect
            id={`${id}-unit`}
            className="w-full"
            value={unit.id}
            disabled={disabled}
            onChange={(event) => setSelectedUnitId(event.target.value)}
          >
            {units.map((unit) => (
              <NativeSelectOption key={unit.id} value={unit.id}>
                {unit.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex min-w-0 flex-col gap-0.5 text-xs md:pt-2">
          <p id={`${id}-conversion`} className="text-muted-foreground tabular-nums">
            {Number.isFinite(line.plannedTotal)
              ? `= ${formatQuantity(line.plannedTotal - received)} ${item.baseUnitName ?? ''}`
              : 'Nhập số lượng để xem quy đổi.'}
          </p>
          {unit.factor !== 1 ? (
            <p className="text-muted-foreground break-words">
              1 {unit.name} = {formatQuantity(unit.factor)} {item.baseUnitName}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Cất toàn bộ còn lại"
            title="Điền toàn bộ số lượng còn lại của sản phẩm vào dòng này"
            disabled={disabled || remaining <= 0}
            onClick={() => onChange({ plannedTotal: planTotalFromRemaining(received, remaining) })}
          >
            Còn lại
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Xóa phân bổ ${line.path || item.sku}`}
            disabled={disabled || received > 0}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
