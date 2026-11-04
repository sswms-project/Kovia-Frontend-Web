import type { CycleCountItem } from '../types/cycle-count.types'
import { CYCLE_COUNT_QUALITY_LABELS } from './cycle-count-format'

/** Preserve hidden and uncounted values from the authorized detail response. */
export function cycleCountPdfValues(item: CycleCountItem) {
  for (const value of [
    item.systemQuantity,
    item.countedQuantity,
    item.countedDamagedQuantity,
    item.difference,
  ]) {
    if (value !== null && !Number.isFinite(value))
      throw new Error('Không thể xuất PDF: số liệu kiểm kê không hợp lệ.')
  }
  if (
    item.countedQuantity !== null &&
    item.countedDamagedQuantity !== null &&
    item.countedDamagedQuantity > item.countedQuantity
  )
    throw new Error('Không thể xuất PDF: số hỏng vượt số thực kiểm.')
  const hidden = item.systemQuantity === null
  return {
    qualityLabel: CYCLE_COUNT_QUALITY_LABELS[item.qualityStatus] ?? 'Chưa xác định',
    systemQuantity: item.systemQuantity,
    countedQuantity: item.countedQuantity,
    damagedQuantity: item.countedDamagedQuantity,
    surplus: hidden || item.difference === null ? null : Math.max(item.difference, 0),
    shortage: hidden || item.difference === null ? null : Math.max(-item.difference, 0),
    hidden,
  }
}
