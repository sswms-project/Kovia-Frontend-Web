import type {
  StockIssueRequestItem,
  StockIssueRequestStatus,
  StockIssueRequestSummary,
  GoodsReturnRequestItemCondition,
  GoodsReturnRequestStatus,
} from '../types/stock-issue.types'
import { formatStockIssueLocation } from './stock-issue-location'

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
  Draft: 'Nháp',
  Cancelled: 'Đã hủy',
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

export function canEditStockIssueRequest(status: StockIssueRequestStatus): boolean {
  return status === 'Pending'
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

/** Số đơn vị cơ sở trong một đơn vị đã chọn của dòng; phiếu cũ chưa lưu đơn vị thì là 1. */
export function stockIssueItemFactor(
  item: Pick<StockIssueRequestItem, 'conversionFactor'>
): number {
  return item.conversionFactor > 0 ? item.conversionFactor : 1
}

/** Số đã lấy theo đơn vị của dòng (thùng, kiện…). */
export function stockIssuePickedEntered(
  item: Pick<StockIssueRequestItem, 'pickedQuantity' | 'conversionFactor'>
): number {
  return item.pickedQuantity / stockIssueItemFactor(item)
}

export function formatStockIssueUnitQuantity(value: number, unitName: string): string {
  return `${formatStockIssueQuantity(value)} ${unitName}`.trim()
}

export interface StockIssueProgress {
  readonly done: number
  readonly total: number
  readonly doneText: string
  readonly totalText: string
  readonly suffix: string
}

/**
 * Tiến độ lấy hàng theo kiện: cộng theo đơn vị đã chọn khi cả phiếu dùng chung một đơn vị. Phiếu trộn
 * nhiều đơn vị (thùng lẫn hộp) không cộng được với nhau nên đếm số dòng đã lấy đủ.
 */
export function summarizeStockIssueProgress(
  order: Pick<StockIssueRequestSummary, 'items'>
): StockIssueProgress {
  const unitNames = new Set(order.items.map((item) => item.enteredUnitName))
  if (unitNames.size <= 1) {
    const done = order.items.reduce((sum, item) => sum + stockIssuePickedEntered(item), 0)
    const total = order.items.reduce((sum, item) => sum + item.enteredQuantity, 0)
    return {
      done,
      total,
      doneText: formatStockIssueQuantity(done),
      totalText: formatStockIssueQuantity(total),
      suffix: [...unitNames][0] ?? '',
    }
  }
  const done = order.items.filter((item) => item.pickedQuantity >= item.quantity).length
  return {
    done,
    total: order.items.length,
    doneText: String(done),
    totalText: String(order.items.length),
    suffix: 'dòng',
  }
}

/** Mã các vị trí còn phải đến lấy, theo thứ tự đi kho (đã được backend sắp theo khu, kệ, ô). */
export function stockIssuePendingSlotCodes(
  order: Pick<StockIssueRequestSummary, 'items'>
): string[] {
  const codes = order.items.flatMap((item) =>
    item.pickLocations.map((location) => location.slotCode)
  )
  return [...new Set(codes)]
}

export function summarizeStockIssueSlots(
  order: Pick<StockIssueRequestSummary, 'items'>,
  limit = 3
): string | null {
  const codes = [
    ...new Set(order.items.flatMap((item) => item.pickLocations.map(formatStockIssueLocation))),
  ]
  if (codes.length === 0) return null
  const shown = codes.slice(0, limit).join(', ')
  return codes.length > limit ? `${shown} +${codes.length - limit}` : shown
}
