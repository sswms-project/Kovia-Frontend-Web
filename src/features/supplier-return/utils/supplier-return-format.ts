import type { SupplierReturnStatus } from '../types/supplier-return.types'

export const SUPPLIER_RETURN_STATUS_LABELS: Record<SupplierReturnStatus, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Cancelled: 'Đã huỷ',
  Completed: 'Hoàn tất',
}
