import type { TransferAllocationMove, TransferAllocationOption } from '../types/transfer.types'
import { isNonFefoChoice } from './transfer-scan'

/** Số lượng phân bổ mới theo từng tồn kho (vị trí/lô); chỉ cần điền các dòng người dùng đã sửa. */
export type AllocationTargets = Readonly<Record<string, number>>

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Phần đã lấy ra không chuyển được nên là mức giữ chỗ thấp nhất của vị trí. */
export function minAllocation(option: TransferAllocationOption) {
  return round2(option.reservedForItem - option.movableQuantity)
}

/** Nhiều nhất là phần đang giữ cộng tồn còn trống ở đó. */
export function maxAllocation(option: TransferAllocationOption) {
  return round2(option.reservedForItem + option.availableQuantity)
}

export function initialTargets(options: readonly TransferAllocationOption[]): AllocationTargets {
  return Object.fromEntries(
    options.map((option) => [option.inventoryStockId, option.reservedForItem])
  )
}

function targetOf(option: TransferAllocationOption, targets: AllocationTargets) {
  return round2(targets[option.inventoryStockId] ?? option.reservedForItem)
}

/** Chênh lệch so với đang giữ: dương là lấy thêm ở vị trí này, âm là bớt đi. */
export function deltaOf(option: TransferAllocationOption, targets: AllocationTargets) {
  return round2(targetOf(option, targets) - option.reservedForItem)
}

/** Trả về thông báo lỗi tiếng Việt hoặc null khi phân bổ mới hợp lệ (tổng không đổi, trong giới hạn từng vị trí). */
export function validateTargets(
  options: readonly TransferAllocationOption[],
  targets: AllocationTargets
): string | null {
  let total = 0
  for (const option of options) {
    const target = targets[option.inventoryStockId] ?? option.reservedForItem
    if (!Number.isFinite(target) || target < 0) return 'Số lượng phân bổ không hợp lệ.'
    if (Math.abs(target * 100 - Math.round(target * 100)) > 1e-9)
      return 'Số lượng chỉ có tối đa 2 chữ số thập phân.'
    if (target < minAllocation(option))
      return `${option.location}: phần đã lấy (${minAllocation(option)}) không chuyển được.`
    if (target > maxAllocation(option))
      return `${option.location}: chỉ còn trống ${option.availableQuantity} để lấy thêm.`
    total += deltaOf(option, targets)
  }
  if (Math.abs(round2(total)) > 0)
    return 'Tổng số lượng phải giữ nguyên: số bớt ở nơi này phải được chuyển sang nơi khác.'
  return null
}

export function hasChanges(
  options: readonly TransferAllocationOption[],
  targets: AllocationTargets
) {
  return options.some((option) => deltaOf(option, targets) !== 0)
}

/** Ghép lần lượt các nơi bớt với các nơi lấy thêm thành danh sách chuyển giữ chỗ gửi cho server. */
export function buildAllocationMoves(
  itemId: string,
  options: readonly TransferAllocationOption[],
  targets: AllocationTargets
): TransferAllocationMove[] {
  const sources = options
    .map((option) => ({ id: option.inventoryStockId, left: -deltaOf(option, targets) }))
    .filter((entry) => entry.left > 0)
  const destinations = options
    .map((option) => ({ id: option.inventoryStockId, left: deltaOf(option, targets) }))
    .filter((entry) => entry.left > 0)

  const moves: TransferAllocationMove[] = []
  let sourceIndex = 0
  for (const destination of destinations) {
    while (destination.left > 0 && sourceIndex < sources.length) {
      const source = sources[sourceIndex]
      if (!source) break
      const quantity = round2(Math.min(source.left, destination.left))
      moves.push({
        itemId,
        fromInventoryStockId: source.id,
        toInventoryStockId: destination.id,
        quantity,
      })
      source.left = round2(source.left - quantity)
      destination.left = round2(destination.left - quantity)
      if (source.left <= 0) sourceIndex += 1
    }
  }
  return moves
}

/**
 * Các vị trí/lô được lấy thêm nhưng hết hạn muộn hơn lô khác còn hàng (không theo FEFO). Chỉ để cảnh báo;
 * hệ thống vẫn cho phép và ghi vào nhật ký.
 */
export function nonFefoStockIds(
  options: readonly TransferAllocationOption[],
  targets: AllocationTargets
): ReadonlySet<string> {
  const candidates = options.filter(
    (option) => option.reservedForItem > 0 || option.availableQuantity > 0
  )
  return new Set(
    options
      .filter((option) => deltaOf(option, targets) > 0 && option.lotNumber !== null)
      .filter((option) => isNonFefoChoice(option, candidates))
      .map((option) => option.inventoryStockId)
  )
}
