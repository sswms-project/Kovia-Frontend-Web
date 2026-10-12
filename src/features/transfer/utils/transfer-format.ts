import type {
  TransferDiscrepancyAction,
  TransferDiscrepancyType,
  TransferDispatchProgress,
  TransferEscalationAction,
  TransferFeedbackReason,
  TransferFeedbackStatus,
  TransferPickReason,
  TransferReceiptReason,
  TransferReceiveProgress,
  TransferShipmentLineStatus,
  TransferShipmentStatus,
  TransferStatus,
} from '../types/transfer.types'

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  Draft: 'Nháp',
  InProgress: 'Đang thực hiện',
  AwaitingResolution: 'Chờ xử lý chênh lệch',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  PendingSourceApproval: 'Chờ duyệt (quy trình cũ)',
  Approved: 'Đã duyệt (quy trình cũ)',
  InTransit: 'Đang vận chuyển (quy trình cũ)',
  ReceivedWithVariance: 'Nhận có chênh lệch (quy trình cũ)',
  Rejected: 'Bị từ chối (quy trình cũ)',
}

export const TRANSFER_STATUS_DESCRIPTIONS: Record<TransferStatus, string> = {
  Draft: 'Chưa giữ chỗ tồn kho, chỉ người tạo nhìn thấy.',
  InProgress: 'Đã giữ chỗ tồn kho; đang chia đợt, lấy, xuất hoặc nhận hàng.',
  AwaitingResolution: 'Hàng đã xuất và nhận xong, còn chênh lệch chờ kho nhận xử lý.',
  Completed: 'Mọi dòng hàng đã khớp, phiếu hoàn tất tự động.',
  Cancelled: 'Phiếu đã hủy, mọi giữ chỗ đã được nhả.',
  PendingSourceApproval: 'Phiếu thuộc quy trình cũ, chỉ xem.',
  Approved: 'Phiếu thuộc quy trình cũ, chỉ xem.',
  InTransit: 'Phiếu thuộc quy trình cũ, chỉ xem.',
  ReceivedWithVariance: 'Phiếu thuộc quy trình cũ, chỉ xem.',
  Rejected: 'Phiếu thuộc quy trình cũ, chỉ xem.',
}

export const DISPATCH_PROGRESS_LABELS: Record<TransferDispatchProgress, string> = {
  NotDispatched: 'Chưa xuất',
  PartiallyDispatched: 'Xuất một phần',
  Dispatched: 'Đã xuất đủ',
}

export const RECEIVE_PROGRESS_LABELS: Record<TransferReceiveProgress, string> = {
  NotReceived: 'Chưa nhận',
  PartiallyReceived: 'Nhận một phần',
  Received: 'Đã nhận đủ',
}

export const SHIPMENT_STATUS_LABELS: Record<TransferShipmentStatus, string> = {
  Picking: 'Đang lấy hàng',
  ReadyToDispatch: 'Chờ xuất kho',
  InTransit: 'Đang vận chuyển',
  Receiving: 'Đang nhận hàng',
  Received: 'Đã nhận',
  ReceivedWithDiscrepancy: 'Đã nhận, có chênh lệch',
  Cancelled: 'Đã hủy',
}

/** Trạng thái thực hiện công việc kho (do BE trả về dạng mã tiếng Anh). */
export const TASK_EXECUTION_LABELS: Record<string, string> = {
  Queued: 'Chờ bắt đầu',
  InProgress: 'Đang làm',
  Paused: 'Tạm dừng',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
}

export const SHIPMENT_LINE_STATUS_LABELS: Record<TransferShipmentLineStatus, string> = {
  Pending: 'Chờ lấy',
  Picking: 'Đang lấy',
  Picked: 'Đã lấy đủ',
  PendingManager: 'Chờ quản lý xử lý',
  Dispatched: 'Đã xuất',
}

export const FEEDBACK_REASON_LABELS: Record<TransferFeedbackReason, string> = {
  InsufficientStock: 'Không đủ hàng thực tế',
  DamagedStock: 'Hàng hỏng',
  CannotMeetDeadline: 'Không kịp hạn',
  Other: 'Khác',
}

export const FEEDBACK_STATUS_LABELS: Record<TransferFeedbackStatus, string> = {
  Open: 'Chờ trả lời',
  Answered: 'Đã trả lời',
  Closed: 'Đã đóng',
}

export const PICK_REASON_LABELS: Record<TransferPickReason, string> = {
  InsufficientAtLocation: 'Không đủ hàng tại vị trí',
  NotFound: 'Không có hàng',
  Damaged: 'Hàng hỏng',
  LocationBlocked: 'Vị trí bị chặn hoặc khó lấy',
  LotExhausted: 'Lô đã hết hoặc sai lô',
  NonFefoLot: 'Lô không theo FEFO',
  Other: 'Khác (ghi chú bắt buộc)',
}

export const RECEIPT_REASON_LABELS: Record<TransferReceiptReason, string> = {
  TransitDamage: 'Vỡ khi vận chuyển',
  Lost: 'Thất lạc',
  WrongShipment: 'Xuất nhầm',
  Other: 'Khác',
}

export const DISCREPANCY_TYPE_LABELS: Record<TransferDiscrepancyType, string> = {
  Damaged: 'Hàng hỏng',
  Missing: 'Hàng thiếu',
}

export const ESCALATION_ACTION_LABELS: Record<TransferEscalationAction, string> = {
  UseStock: 'Chỉ định vị trí/lô khác',
  ReduceQuantity: 'Giảm số lượng của đợt',
  StopLine: 'Dừng phần không lấy được',
}

export const DISCREPANCY_ACTION_LABELS: Record<TransferDiscrepancyAction, string> = {
  LateReceipt: 'Nhận bổ sung',
  ConfirmLoss: 'Ghi nhận thất thoát',
  AcknowledgeDamage: 'Chuyển xử lý hàng hỏng',
}

/** Lý do làm đổi tồn thực tế tại vị trí cũ nên cần gợi ý kiểm kê. */
export const PICK_REASONS_SUGGESTING_COUNT: readonly TransferPickReason[] = [
  'InsufficientAtLocation',
  'NotFound',
  'Damaged',
]

export function labelOf(
  labels: Readonly<Record<string, string>>,
  key: string | null | undefined,
  fallback = '—'
): string {
  if (!key) return fallback
  return labels[key] ?? key
}
