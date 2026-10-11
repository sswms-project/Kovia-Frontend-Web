import type { LifecycleEvent } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferDetail } from '../types/transfer.types'
import { FEEDBACK_REASON_LABELS, labelOf } from './transfer-format'

const DISCREPANCY_RESOLUTION_LABELS: Record<string, string> = {
  LateReceipt: 'nhận bổ sung',
  LossAdjustment: 'ghi nhận thất thoát',
  DamageCase: 'chuyển xử lý hàng hỏng',
}

function event(
  action: string,
  createdAt: string | null | undefined,
  actorName = '',
  reason: string | null = null
): LifecycleEvent | null {
  if (!createdAt) return null
  return { action, fromState: null, toState: null, actorId: '', actorName, reason, createdAt }
}

/**
 * Dòng thời gian suy ra từ dữ liệu phiếu. BE chưa có API lịch sử riêng nên chỉ hiện các mốc có thời điểm
 * rõ ràng; người thực hiện chỉ có khi phiếu trả về tên.
 */
export function buildTransferHistory(detail: TransferDetail): LifecycleEvent[] {
  const events: Array<LifecycleEvent | null> = [
    event('Tạo phiếu', detail.createdAt, detail.createdByName ?? ''),
    event('Gửi yêu cầu và giữ chỗ tồn kho', detail.submittedAt, detail.createdByName ?? ''),
  ]
  for (const feedback of detail.feedbacks ?? []) {
    events.push(
      event(
        `Phản hồi: ${labelOf(FEEDBACK_REASON_LABELS, feedback.reasonCode)}`,
        feedback.createdAt,
        feedback.authorName ?? '',
        feedback.message
      ),
      event('Trả lời phản hồi', feedback.repliedAt, '', feedback.reply)
    )
  }
  for (const shipment of detail.shipments ?? []) {
    events.push(
      event(`Tạo đợt xuất ${shipment.shipmentNumber}`, shipment.createdAt),
      event(`Xuất đợt ${shipment.shipmentNumber}`, shipment.dispatchedAt),
      event(`Nhận đợt ${shipment.shipmentNumber}`, shipment.receivedAt)
    )
  }
  for (const discrepancy of detail.discrepancies ?? []) {
    const type = discrepancy.type === 'Missing' ? 'hàng thiếu' : 'hàng hỏng'
    events.push(
      event(
        `Phát sinh chênh lệch ${type} (${discrepancy.sku})`,
        discrepancy.createdAt,
        '',
        discrepancy.reasonCode
      ),
      event(
        `Xử lý chênh lệch ${type}: ${labelOf(DISCREPANCY_RESOLUTION_LABELS, discrepancy.resolution, 'đã xử lý')}`,
        discrepancy.resolvedAt,
        '',
        discrepancy.note
      )
    )
  }
  events.push(
    event('Dừng phần còn lại', detail.stoppedAt, '', detail.stopReason),
    event('Hủy phiếu', detail.cancelledAt, '', detail.cancellationReason),
    event('Hoàn tất', detail.completedAt)
  )

  return events
    .filter((entry): entry is LifecycleEvent => entry !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}
