import type { LowStockAlertFilters } from '../types/low-stock-alert.types'
export const LOW_STOCK_FILTER_LABELS: Record<string, string> = {
  Active: 'Chưa kết thúc',
  Open: 'Đang cảnh báo',
  Acknowledged: 'Đã tiếp nhận',
  Resolved: 'Đã kết thúc',
  All: 'Tất cả trạng thái',
}
export const LOW_STOCK_NOTICE =
  'Số tồn và ngưỡng được cập nhật trong đợt cảnh báo, có thể khác số liệu tồn kho hiện tại.'
export const LOW_STOCK_INACTIVE_NOTICE =
  'Trạng thái cảnh báo theo lần đánh giá đã lưu; sản phẩm hoặc kho hiện đã ngừng hoạt động.'
export const isLowStockGuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
  value !== '00000000-0000-0000-0000-000000000000'
export function validateLowStockFilters(
  filters: LowStockAlertFilters,
  alertId = ''
): string | null {
  if ([filters.warehouseId, filters.productId, alertId].some((id) => id && !isLowStockGuid(id)))
    return 'Mã kho, sản phẩm hoặc cảnh báo không hợp lệ. Hãy sửa hoặc chủ động bỏ bộ lọc.'
  if (!LOW_STOCK_FILTER_LABELS[filters.statusFilter]) return 'Bộ lọc trạng thái không hợp lệ.'
  if (
    !Number.isSafeInteger(filters.pageNumber) ||
    filters.pageNumber < 1 ||
    filters.pageNumber > Math.floor(2147483647 / filters.pageSize) ||
    ![10, 20, 30, 50].includes(filters.pageSize)
  )
    return 'Phân trang không hợp lệ.'
  if ((filters.searchTerm?.trim().length ?? 0) > 100) return 'Từ khóa tối đa 100 ký tự.'
  for (const date of [filters.dateFrom, filters.dateTo]) {
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date === '9999-12-31' ||
        date === '0001-01-01')
    )
      return 'Ngày lọc không hợp lệ.'
  }
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo)
    return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.'
  return null
}
export function lowStockDate(value: string | null, fallback = 'Chưa có thông tin') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(date)
}
export function lowStockQuantity(value: number, precision: number | null) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: precision ?? 2 }).format(value)
}
