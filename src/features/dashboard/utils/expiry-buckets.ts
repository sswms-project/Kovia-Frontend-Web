import type { StockExpiryDistribution } from '../schemas/stock-alert.schema'

export interface ExpiryBucket {
  readonly label: string
  readonly from: number
  readonly to: number
  readonly lotCount: number
}

// Mốc gấp nhất tách riêng; khoảng càng xa càng rộng.
const BUCKET_LIMITS = [
  [0, 0],
  [1, 3],
  [4, 7],
  [8, 15],
  [16, 30],
  [31, 90],
  [91, 365],
] as const

/** Gom số lô theo khoảng số ngày còn lại, chỉ giữ các khoảng nằm trong N ngày đang xem. */
export function toExpiryBuckets(
  days: StockExpiryDistribution['days'],
  expiringDays: number
): ExpiryBucket[] {
  return BUCKET_LIMITS.filter(([from]) => from <= expiringDays).map(([from, limit]) => {
    const to = Math.min(limit, expiringDays)
    return {
      label: from === 0 ? 'Hôm nay' : from === to ? `${from} ngày` : `${from}–${to} ngày`,
      from,
      to,
      lotCount: days
        .filter((day) => day.daysToExpiry >= from && day.daysToExpiry <= to)
        .reduce((sum, day) => sum + day.lotCount, 0),
    }
  })
}
