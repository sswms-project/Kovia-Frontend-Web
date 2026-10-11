import type {
  StockIssueRequestStatus,
  GoodsReturnRequestItemCondition,
  GoodsReturnRequestStatus,
} from '../types/stock-issue.types'

export const STOCK_ISSUE_REQUEST_STATUS_LABELS: Record<StockIssueRequestStatus, string> = {
  Pending: 'Chờ xử lý',
  ReleasedForPicking: 'Đã giao việc, chờ lấy hàng',
  Picking: 'Đang lấy hàng',
  Picked: 'Sẵn sàng xuất (chờ lệnh)',
  AuthorizedForDispatch: 'Đã cho phép xuất',
  Dispatched: 'Đã xuất kho',
  Cancelled: 'Đã hủy',
}

export const RETURN_STATUS_LABELS: Record<GoodsReturnRequestStatus, string> = {
  Requested: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Restocked: 'Đã nhập lại kho',
}

export const RETURN_ITEM_CONDITION_LABELS: Record<GoodsReturnRequestItemCondition, string> = {
  Good: 'Còn tốt',
  Damaged: 'Hư hỏng',
  Expired: 'Hết hạn',
  Scrap: 'Hủy bỏ',
}

export function formatStockIssueQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

export function formatStockIssueDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function canRecordStockPicking(status: StockIssueRequestStatus): boolean {
  return status === 'ReleasedForPicking' || status === 'Picking'
}

export function canCancelStockIssueRequest(status: StockIssueRequestStatus): boolean {
  return status === 'Pending' || status === 'ReleasedForPicking'
}

export function canCreateGoodsReturnRequest(status: StockIssueRequestStatus): boolean {
  return status === 'Dispatched'
}

export function canApproveGoodsReturnRequest(status: GoodsReturnRequestStatus): boolean {
  return status === 'Requested'
}
