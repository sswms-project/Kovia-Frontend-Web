import {
  CYCLE_COUNT_STATUSES,
  STOCK_ADJUSTMENT_STATUSES,
  type CycleCountStatus,
  type CycleCountDetail,
  type CycleCountItem,
  type CycleCountSummary,
  type StockAdjustmentStatus,
} from '../types/cycle-count.types'

export const CYCLE_COUNT_STATUS_LABELS: Record<CycleCountStatus, string> = {
  [CYCLE_COUNT_STATUSES.scheduled]: 'Chưa kiểm kê',
  [CYCLE_COUNT_STATUSES.counting]: 'Đang kiểm kê',
  [CYCLE_COUNT_STATUSES.submitted]: 'Chờ duyệt',
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

// Chênh lệch âm hiển thị trong ngoặc theo cách trình bày kế toán.
export function formatCountDifference(value: number | null): string {
  if (value === null) return '—'
  return value < 0 ? `(${formatCount(-value)})` : formatCount(value)
}

// Phiếu đã hoàn tất chỉ thực sự xong khi mọi dòng lệch đã có điều chỉnh tồn được duyệt.
export function getAdjustmentState(item: CycleCountSummary) {
  const variance = item.varianceItemCount ?? 0
  if (item.status !== CYCLE_COUNT_STATUSES.completed || variance === 0) return null
  if (item.adjustedItemCount < variance)
    return {
      label: `Cần tạo điều chỉnh (${item.adjustedItemCount}/${variance})`,
      variant: 'destructive',
    } as const
  if (item.approvedAdjustmentItemCount < variance)
    return {
      label: `Chờ duyệt điều chỉnh (${item.approvedAdjustmentItemCount}/${variance})`,
      variant: 'outline',
    } as const
  return { label: 'Đã xử lý', variant: 'secondary' } as const
}

// Phiếu đã hoàn tất chỉ mở lại để đếm những dòng còn lệch và chưa được xử lý bằng phiếu điều chỉnh hay hồ sơ hàng hỏng.
export function getRecountBlockReason(
  item: CycleCountItem,
  status: CycleCountDetail['status']
): string | null {
  if (status !== 'Completed') return null
  if (item.difference === null || item.difference === 0)
    return 'Dòng khớp sổ sách, không cần đếm lại'
  if (item.activeAdjustmentId) return 'Đã có phiếu điều chỉnh tồn'
  if (item.damageCaseId) return 'Đã có hồ sơ hàng hỏng'
  return null
}

// Phiếu khẩn chỉ cần nổi bật khi còn việc phải làm; phiếu chờ duyệt, đã hoàn tất hay đã huỷ thì không còn gấp với nhân viên kho.
export function isUrgentOpen(priority: CycleCountSummary['priority'], status: CycleCountStatus) {
  return (
    priority === 'Urgent' &&
    (status === CYCLE_COUNT_STATUSES.scheduled ||
      status === CYCLE_COUNT_STATUSES.counting ||
      status === CYCLE_COUNT_STATUSES.recount)
  )
}

export interface DeadlineHint {
  readonly label: string
  readonly tone: 'overdue' | 'soon' | 'normal'
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.floor(milliseconds / 60_000))
  if (minutes < 60) return `${minutes} phút`
  if (minutes < 1_440) {
    const rest = minutes % 60
    return rest ? `${Math.floor(minutes / 60)} giờ ${rest} phút` : `${Math.floor(minutes / 60)} giờ`
  }
  return `${Math.floor(minutes / 1_440)} ngày`
}

// "Còn 5 giờ" / "Quá hạn 2 giờ" so với hạn xử lý của việc; dưới 24 giờ là sắp đến hạn.
export function getDeadlineHint(dueAt: string | null, now = Date.now()): DeadlineHint | null {
  if (!dueAt) return null
  const remaining = new Date(dueAt).getTime() - now
  if (remaining < 0) return { label: `Quá hạn ${formatDuration(-remaining)}`, tone: 'overdue' }
  return {
    label: `Còn ${formatDuration(remaining)}`,
    tone: remaining < 86_400_000 ? 'soon' : 'normal',
  }
}
