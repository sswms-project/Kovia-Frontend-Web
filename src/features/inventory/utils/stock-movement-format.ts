import { STOCK_MOVEMENT_TYPES } from '../types/inventory.types'

const movementLabels: Record<string, string> = {
  [STOCK_MOVEMENT_TYPES.inbound]: 'Nhập kho',
  [STOCK_MOVEMENT_TYPES.putAway]: 'Cất hàng',
  [STOCK_MOVEMENT_TYPES.pick]: 'Lấy hàng',
  [STOCK_MOVEMENT_TYPES.issue]: 'Xuất kho',
  [STOCK_MOVEMENT_TYPES.transferOut]: 'Điều chuyển đi',
  [STOCK_MOVEMENT_TYPES.transferIn]: 'Điều chuyển đến',
  [STOCK_MOVEMENT_TYPES.adjustment]: 'Điều chỉnh',
  [STOCK_MOVEMENT_TYPES.returnIn]: 'Nhập hàng trả lại',
  [STOCK_MOVEMENT_TYPES.returnOut]: 'Trả nhà cung cấp',
  [STOCK_MOVEMENT_TYPES.scrap]: 'Loại bỏ',
  [STOCK_MOVEMENT_TYPES.opening]: 'Tồn đầu kỳ',
  [STOCK_MOVEMENT_TYPES.reclassification]: 'Phân loại lại',
  [STOCK_MOVEMENT_TYPES.correction]: 'Sửa sai biến động',
}

export function formatStockMovementType(value: string): string {
  return movementLabels[value] ?? (value || 'Không xác định')
}

export function formatStockMovementQuantity(value: number): string {
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
  return value > 0 ? `+${formatted}` : formatted
}

export function formatReferenceId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

export function formatStockMovementReference(value: string): string {
  const labels: Record<string, string> = {
    GoodsReceiptItem: 'Phiếu nhận hàng',
    GoodsReceipt: 'Phiếu nhận hàng',
    StockTransfer: 'Phiếu điều chuyển',
    StockTransferItem: 'Phiếu điều chuyển',
    StockIssuePickDetail: 'Phiếu xuất kho',
    StockIssueRequest: 'Yêu cầu xuất kho',
    StockIssueRequestItem: 'Yêu cầu xuất kho',
    StockAdjustment: 'Phiếu điều chỉnh tồn',
    CycleCount: 'Phiếu kiểm kê',
    OpeningStockRecord: 'Phiếu tồn đầu kỳ',
    DamageCase: 'Phiếu hàng hỏng',
    GoodsReturnRequestItem: 'Phiếu trả hàng',
    GoodsReturnRequest: 'Phiếu trả hàng',
    SupplierReturnItem: 'Phiếu trả NCC',
    SupplierReturnRequest: 'Phiếu trả NCC',
    PutAwayCorrection: 'Phiếu sửa vị trí cất hàng',
    WarehouseTaskExecution: 'Công việc kho',
  }
  return labels[value] ?? (value ? 'Chứng từ khác' : 'Không có nguồn')
}
