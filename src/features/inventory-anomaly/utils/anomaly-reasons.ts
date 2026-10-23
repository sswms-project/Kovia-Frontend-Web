import { formatStockMovementType } from '@/features/inventory/utils/stock-movement-format'
import type {
  AnomalyReviewStatus,
  AnomalyScanStatus,
  AnomalySeverity,
  InventoryAnomaly,
  InventoryAnomalyReason,
} from '../types/inventory-anomaly.types'

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function formatNumber(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: fractionDigits }).format(value)
}

function formatPercent(share: number) {
  return `${formatNumber(share * 100, share < 0.01 ? 2 : 1)}%`
}

function formatLocalTime(isoDate: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

/** Câu tiếng Việt cho một lý do của mô hình, luôn kèm đúng số liệu mô hình đã dùng. */
export function formatAnomalyReason(
  reason: InventoryAnomalyReason,
  anomaly: Pick<InventoryAnomaly, 'movementType' | 'unitName' | 'occurredAt' | 'performedByName'>
): string {
  const movementType = formatStockMovementType(anomaly.movementType).toLocaleLowerCase('vi-VN')
  const unit = anomaly.unitName ? ` ${anomaly.unitName}` : ''
  const baseline = reason.baseline
  switch (reason.code) {
    case 'QTY_DEVIATION': {
      const quantity = `${formatNumber(reason.value)}${unit}`
      if (baseline && baseline > 0 && reason.value > baseline)
        return `Số lượng ${quantity}, gấp ${formatNumber(reason.value / baseline, 1)} lần mức thường gặp (≈ ${formatNumber(baseline)}${unit}) của sản phẩm này với loại ${movementType}.`
      return `Số lượng ${quantity} khác xa mức thường gặp (≈ ${formatNumber(baseline ?? 0)}${unit}) của sản phẩm này.`
    }
    case 'SHARE_OF_STOCK':
      return `Lấy ${formatPercent(reason.value)} tồn của vị trí trong một lần, trong khi thường chỉ khoảng ${formatPercent(baseline ?? 0)}.`
    case 'UNUSUAL_HOUR':
      return `Thực hiện vào ${formatLocalTime(anomaly.occurredAt)}, khung giờ chỉ chiếm ${formatPercent(baseline ?? 0)} giao dịch ${movementType} của kho.`
    case 'RARE_TYPE_FOR_PRODUCT':
      return `Lần đầu sản phẩm có giao dịch ${movementType} trong 90 ngày, dù loại này chiếm ${formatPercent(baseline ?? 0)} giao dịch của kho.`
    case 'UNFAMILIAR_USER':
      return `${anomaly.performedByName || 'Người thực hiện'} chưa từng ${movementType} sản phẩm này trong ${formatNumber(baseline ?? 0, 0)} lần trước đó của kho.`
    case 'BURST':
      return `${formatNumber(reason.value, 0)} giao dịch ${movementType} cùng người, cùng sản phẩm trong một ngày (thường ≈ ${formatNumber(baseline ?? 0, 1)}).`
    case 'IRREGULAR_GAP':
      return `Sản phẩm không có biến động trong ${formatNumber(reason.value, 1)} ngày trước đó (thường ≈ ${formatNumber(baseline ?? 0, 1)} ngày).`
    case 'NEGATIVE_ADJUSTMENT':
      return `Điều chỉnh giảm ${formatNumber(Math.abs(reason.value))}${unit}.`
    case 'CORRECTION':
      return 'Đây là giao dịch sửa sai một biến động trước đó.'
    default:
      return 'Mô hình ghi nhận đặc điểm khác thường so với lịch sử của kho.'
  }
}

export const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  High: 'Cao',
  Medium: 'Trung bình',
}

export const ANOMALY_REVIEW_STATUS_LABELS: Record<AnomalyReviewStatus, string> = {
  Open: 'Chờ xem xét',
  Confirmed: 'Đã xác nhận bất thường',
  Dismissed: 'Bình thường',
}

export const ANOMALY_SCAN_STATUS_LABELS: Record<AnomalyScanStatus, string> = {
  Running: 'Đang quét',
  Completed: 'Hoàn tất',
  InsufficientData: 'Chưa đủ dữ liệu',
  Failed: 'Thất bại',
}
