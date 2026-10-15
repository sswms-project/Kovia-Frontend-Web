import type { WarehouseReport } from '../schemas/warehouse-report.schema'

const labels: Record<string, string> = {
  warehouseName: 'Kho',
  sku: 'Mã hàng',
  productName: 'Mặt hàng',
  categoryName: 'Nhóm vật tư / hàng hóa',
  unit: 'Đơn vị',
  openingBalance: 'Tồn đầu kỳ',
  closingBalance: 'Tồn cuối kỳ',
  externalIn: 'Nhập hàng',
  externalOut: 'Xuất hàng',
  transferIn: 'Chuyển kho đến',
  transferOut: 'Chuyển kho đi',
  otherChanges: 'Điều chỉnh khác (+/−)',
}
export const balanceColumnHints: Record<string, string> = {
  openingBalance: 'Số lượng tồn tại đầu kỳ đã chọn. Chưa đủ lịch sử sẽ hiển thị “Chưa xác định”.',
  externalIn: 'Hàng nhập hoặc nhận trả lại đã ghi sổ; không gồm điều chuyển từ kho khác.',
  externalOut: 'Hàng xuất hoặc loại bỏ đã ghi sổ; không gồm điều chuyển sang kho khác.',
  transferIn: 'Hàng đã nhận từ kho khác trong doanh nghiệp.',
  transferOut: 'Hàng đã xuất điều chuyển sang kho khác trong doanh nghiệp.',
  otherChanges:
    'Số có dấu (+/−), gồm khai báo tồn đầu trong kỳ, điều chỉnh tồn, dịch chuyển nội bộ ròng và sửa nhật ký. Bấm mặt hàng để xem từng biến động.',
  closingBalance:
    'Tồn đầu kỳ + nhập hàng + chuyển kho đến − xuất hàng − chuyển kho đi + điều chỉnh khác.',
}
export function reportTableLayout(report: WarehouseReport) {
  const productKey = report.columns.some((c) => c.key === 'productName')
    ? 'productName'
    : report.columns.some((c) => c.key === 'sku')
      ? 'sku'
      : undefined
  let columns = report.columns.filter(
    (c) =>
      c.key !== 'historyStatus' &&
      !(c.key === 'sku' && productKey === 'productName') &&
      !(c.key === 'warehouseName' && report.appliedFilters.warehouseIds.length === 1)
  )
  if (report.reportType === 'inventory-balance') {
    const order = [
      'warehouseName',
      'productName',
      'categoryName',
      'unit',
      'openingBalance',
      'externalIn',
      'transferIn',
      'externalOut',
      'transferOut',
      'otherChanges',
      'closingBalance',
    ]
    columns = [
      ...order.flatMap((key) => columns.filter((c) => c.key === key)),
      ...columns.filter((c) => !order.includes(c.key)),
    ]
  }
  return {
    productKey,
    columns: columns.map((c) => ({
      ...c,
      label: c.key === productKey ? 'Mặt hàng' : (labels[c.key] ?? c.label),
    })),
  }
}
