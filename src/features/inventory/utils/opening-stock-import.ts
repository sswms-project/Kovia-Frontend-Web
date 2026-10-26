import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import type {
  OpeningStockFormOptions,
  OpeningStockImportRow,
} from '../types/opening-stock-import.types'

export function openingStockLocationDescription(
  location: OpeningStockFormOptions['locations'][number]
) {
  if (location.requiresCapacityConfiguration === undefined) return undefined
  if (location.requiresCapacityConfiguration) {
    const quantity =
      location.capacity == null
        ? null
        : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(location.capacity)
    return quantity === null
      ? 'Cần cấu hình sức chứa và đơn vị trước khi nhập hàng.'
      : `Sức chứa khai báo: ${quantity} ${location.capacityUnitName ?? '(chưa có đơn vị)'} · Cần kiểm tra lại cấu hình trước khi nhập hàng.`
  }
  if (location.capacity != null && location.capacityUnitName) {
    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })
    const quantity = formatter.format(location.capacity)
    if (location.remainingCapacity != null) {
      const remaining = formatter.format(location.remainingCapacity)
      const full = location.remainingCapacity === 0 ? ' (đã đầy)' : ''
      return `Còn trống: ${remaining} ${location.capacityUnitName}${full} · Tối đa: ${quantity} ${location.capacityUnitName}`
    }
    return `Sức chứa tối đa: ${quantity} ${location.capacityUnitName}`
  }
  return 'Chưa đặt giới hạn sức chứa.'
}

export function normalizeOpeningStockLotNumber(value: string) {
  return value.trim().normalize('NFC').toUpperCase()
}

export function getOpeningStockPendingLots(
  rows: readonly OpeningStockImportRow[],
  selected: readonly string[]
) {
  const lots = new Map<string, OpeningStockImportRow>()
  for (const row of rows) {
    if (row.newLot && selected.includes(row.rowKey))
      lots.set(`${row.productId}|${normalizeOpeningStockLotNumber(row.newLot.lotNumber)}`, row)
  }
  return [...lots.values()]
}

export function openingStockErrorMessage(error: unknown, fallback: string) {
  if (!isApiErrorResponse(error)) return getApiErrorMessage(error, fallback)
  return getApiErrorMessage(
    {
      ...error,
      errors: Object.fromEntries(
        Object.entries(error.errors ?? {}).filter(
          ([field]) => !['code', 'errorCode'].includes(field)
        )
      ),
    },
    fallback
  )
}
