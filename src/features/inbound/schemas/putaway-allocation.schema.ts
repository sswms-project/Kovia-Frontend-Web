import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptItem } from '../types/inbound.types'
import { putawayLineSchema, type PutawayFormValues } from './inbound.schema'
import { getPutawayBaseQuantity, getPutawayRemainingInput } from '../utils/putaway-units'
import { getSlotRemainingInBaseUnit } from '../utils/putaway-slot-options'

type AllocationField = keyof PutawayFormValues['lines'][number]
interface AllocationSlot {
  id: string
  code: string
  allowsMixedProducts?: boolean
  unavailableReason?: string
  remainingCapacity?: number | null
  capacityUnitId?: string | null
}

// Reserve only complete, valid rows in display order. Hundredths avoid 0.1 + 0.2 rounding drift.
export function getPutawayAllocationState(
  lines: PutawayFormValues['lines'],
  items: readonly GoodsReceiptItem[],
  slots: readonly AllocationSlot[]
) {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  const assignedByItem = new Map<string, number>()
  const productBySlot = new Map<string, string>()
  const requestedByItem = new Map<string, number>()
  const allocations = new Set<string>()
  const assignedBySlot = new Map<string, number>()
  let totalAssigned = 0

  const rows = lines.map((line) => {
    const item = itemById.get(line.goodsReceiptItemId)
    const slot = slotById.get(line.slotId)
    const unit = item?.allowedUnits?.find((candidate) => candidate.unitId === line.enteredUnitId)
    const baseUnit = item?.allowedUnits?.find((candidate) => candidate.unitId === item.baseUnitId)
    const baseQuantity = getPutawayBaseQuantity(line.enteredQuantity, unit, baseUnit)
    const quantity = baseQuantity === null ? 0 : Math.round(baseQuantity * 100)
    const itemAvailable =
      Math.max(
        0,
        Math.round((item?.remainingPutAwayQuantity ?? 0) * 100) -
          (assignedByItem.get(line.goodsReceiptItemId) ?? 0)
      ) / 100
    const allocationKey = `${line.goodsReceiptItemId}:${line.slotId}`
    if (item && Number.isFinite(quantity) && quantity > 0)
      requestedByItem.set(item.id, (requestedByItem.get(item.id) ?? 0) + quantity)

    const result = putawayLineSchema
      .superRefine((value, context) => {
        const error = (field: AllocationField, message: string) =>
          context.addIssue({ code: 'custom', path: [field], message })
        if (!item || !item.inboundRequestItemId)
          error('goodsReceiptItemId', 'Sản phẩm không thuộc dòng yêu cầu nhập kho của phiếu này.')
        if (!unit || !baseUnit)
          error(
            'enteredUnitId',
            'Đơn vị cất không khả dụng. Vui lòng tải lại dữ liệu hoặc chọn đơn vị khác.'
          )
        else if (baseQuantity === null)
          error(
            'enteredQuantity',
            'Số lượng không phù hợp độ chính xác đơn vị hoặc không thể quy đổi chính xác. Hãy đổi đơn vị cất.'
          )
        else if (baseQuantity > itemAvailable)
          error(
            'enteredQuantity',
            `Dòng này tối đa ${formatQuantity(itemAvailable)} ${item?.baseUnitName}; vượt ${formatQuantity((quantity - Math.round(itemAvailable * 100)) / 100)} ${item?.baseUnitName}.`
          )
        if (!slot) error('slotId', 'Vui lòng chọn vị trí lưu trữ còn khả dụng.')
        else {
          if (slot.unavailableReason) error('slotId', slot.unavailableReason)
          const slotRemaining = item ? getSlotRemainingInBaseUnit(slot, item.baseUnitId) : null
          if (slotRemaining !== null && quantity > 0) {
            const free = Math.max(
              0,
              Math.round(slotRemaining * 100) - (assignedBySlot.get(slot.id) ?? 0)
            )
            if (quantity > free)
              error(
                'enteredQuantity',
                `Vượt sức chứa còn lại của vị trí (còn ${formatQuantity(free / 100)} ${item?.baseUnitName}).`
              )
          }
          if (
            slot.allowsMixedProducts === false &&
            item &&
            productBySlot.has(slot.id) &&
            productBySlot.get(slot.id) !== item.productId
          )
            error('slotId', 'Vị trí này chỉ chứa một sản phẩm; đã được phân bổ cho sản phẩm khác.')
        }
        if (allocations.has(allocationKey))
          error('slotId', 'Sản phẩm đã được phân bổ vào vị trí này. Hãy sửa dòng đã có.')
      })
      .safeParse(line)
    const errors: Partial<Record<AllocationField, string>> = {}
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as AllocationField
        errors[field] ??= issue.message
      }
    } else {
      assignedByItem.set(
        line.goodsReceiptItemId,
        (assignedByItem.get(line.goodsReceiptItemId) ?? 0) + quantity
      )
      productBySlot.set(line.slotId, item!.productId)
      assignedBySlot.set(line.slotId, (assignedBySlot.get(line.slotId) ?? 0) + quantity)
      allocations.add(allocationKey)
      totalAssigned += quantity
    }
    return {
      errors,
      itemAvailable,
      baseQuantity,
      unit,
      // Capacity is in its own UOM; only BE can validate the projected converted occupancy.
      maxQuantity: unit ? itemAvailable / unit.conversionFactor : 0,
    }
  })

  return {
    rows,
    assignedByItem,
    requestedByItem,
    totalAssigned: totalAssigned / 100,
    canSubmit: rows.length > 0 && rows.every((row) => Object.keys(row.errors).length === 0),
  }
}

export function getPutawayFillRemaining(
  lines: PutawayFormValues['lines'],
  index: number,
  items: readonly GoodsReceiptItem[],
  slots: readonly AllocationSlot[]
) {
  const line = lines[index]
  const item = items.find((candidate) => candidate.id === line?.goodsReceiptItemId)
  if (!line || !item) return null
  const others = getPutawayAllocationState(
    lines.filter((_, candidate) => candidate !== index),
    items,
    slots
  )
  const remaining =
    Math.max(
      0,
      Math.round(item.remainingPutAwayQuantity * 100) - (others.assignedByItem.get(item.id) ?? 0)
    ) / 100
  return remaining > 0 ? getPutawayRemainingInput(item, remaining, line.enteredUnitId) : null
}
