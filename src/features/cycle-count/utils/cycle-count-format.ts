import {
  CYCLE_COUNT_STATUSES,
  STOCK_ADJUSTMENT_STATUSES,
  type CycleCountStatus,
  type StockAdjustmentStatus,
} from '../types/cycle-count.types'

export const CYCLE_COUNT_STATUS_LABELS: Record<CycleCountStatus, string> = {
  [CYCLE_COUNT_STATUSES.scheduled]: 'Chưa kiểm kê',
  [CYCLE_COUNT_STATUSES.counting]: 'Đang kiểm kê',
  [CYCLE_COUNT_STATUSES.submitted]: 'Chờ quản lý duyệt',
  [CYCLE_COUNT_STATUSES.recount]: 'Yêu cầu đếm lại',
  [CYCLE_COUNT_STATUSES.completed]: 'Đã hoàn tất',
  [CYCLE_COUNT_STATUSES.cancelled]: 'Đã huỷ',
}

export const STOCK_ADJUSTMENT_STATUS_LABELS: Record<StockAdjustmentStatus, string> = {
  [STOCK_ADJUSTMENT_STATUSES.pending]: 'Chờ duyệt',
  [STOCK_ADJUSTMENT_STATUSES.approved]: 'Đã duyệt',
  [STOCK_ADJUSTMENT_STATUSES.rejected]: 'Đã từ chối',
}

export function formatCycleCountDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatCount(value: number | null): string {
  return value === null
    ? '—'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

export const CYCLE_COUNT_QUALITY_LABELS: Record<string, string> = {
  Good: 'Tốt',
  Damaged: 'Hỏng',
  Quarantine: 'Cách ly',
}

export function formatCycleCountDay(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

// Phiếu đã huỷ không còn đếm nữa: tiến độ và số dòng lệch không có nghĩa, UI phải hiện "—".
export function hasCountResults(status: CycleCountStatus): boolean {
  return status !== CYCLE_COUNT_STATUSES.cancelled
}

// Số ngày quá hạn so với "Kiểm kê đến ngày", chỉ tính khi phiếu chưa kết thúc.
export function getOverdueDays(dueDate: string | null, status: CycleCountStatus): number {
  if (
    !dueDate ||
    status === CYCLE_COUNT_STATUSES.completed ||
    status === CYCLE_COUNT_STATUSES.cancelled
  )
    return 0
  const elapsedMilliseconds = Date.now() - new Date(dueDate).getTime()
  return elapsedMilliseconds > 0 ? Math.ceil(elapsedMilliseconds / 86_400_000) : 0
}
