import {
  formatTransferLocation,
  type TransferLocation,
} from '@/features/transfer/utils/transfer-location'
import type { StockIssuePickDetail } from '../types/stock-issue.types'

export function isStockIssueRackLocation(location: TransferLocation): boolean {
  return (
    location.isSystemDefaultSlot === true ||
    location.slotCode.trim().toUpperCase() === '__SYSTEM_DEFAULT__'
  )
}

export function formatStockIssueLocation(location: TransferLocation): string {
  const isSystemDefaultSlot = isStockIssueRackLocation(location)
  if (isSystemDefaultSlot && !location.rackCode)
    return location.zoneCode
      ? `Khu ${location.zoneCode} / Vị trí chưa xác định`
      : 'Vị trí chưa xác định'
  return formatTransferLocation({ ...location, isSystemDefaultSlot }) || 'Vị trí chưa xác định'
}

export function formatStockIssueStagingLocation(detail: StockIssuePickDetail): string {
  return formatStockIssueLocation({
    slotCode: detail.stagingSlotCode,
    zoneCode: detail.stagingZoneCode,
    rackCode: detail.stagingRackCode,
    isSystemDefaultSlot: detail.isSystemDefaultStagingSlot,
  })
}
