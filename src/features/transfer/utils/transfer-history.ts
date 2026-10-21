import type { LifecycleEvent } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferDetail } from '../types/transfer.types'
import { FEEDBACK_REASON_LABELS, labelOf } from './transfer-format'

const DISCREPANCY_RESOLUTION_LABELS: Record<string, string> = {
  LateReceipt: 'nhận bổ sung',
  LossAdjustment: 'ghi nhận thất thoát',
  DamageCase: 'chuyển xử lý hàng hỏng',
}

const REQUEST_EVENT_LABELS: Readonly<Record<string, string>> = {
  Submit: 'Gửi yêu cầu tới kho xuất',
  AcceptRequest: 'Kho xuất chấp nhận và giữ chỗ',
  RejectRequest: 'Kho xuất từ chối',
  WithdrawRequest: 'Thu hồi yêu cầu về nháp',
}

function event(
  action: string,
  createdAt: string | null | undefined,
  actorName = '',
  reason: string | null = null,
  actorId = ''
): LifecycleEvent | null {
  if (!createdAt) return null
  return { action, fromState: null, toState: null, actorId, actorName, reason, createdAt }
}

/**
 * Ưu tiên dấu vết quyết định từ BE; các mốc thực hiện còn lại chỉ suy ra khi có thời điểm rõ ràng.
 */
export function buildTransferHistory(detail: TransferDetail): LifecycleEvent[] {
  const events: Array<LifecycleEvent | null> = [
    event('Tạo phiếu', detail.createdAt, detail.createdByName ?? ''),
    ...(detail.requestEvents?.length
      ? detail.requestEvents.map((entry) =>
          event(
            REQUEST_EVENT_LABELS[entry.action] ?? entry.action,
            entry.createdAt,
            entry.actorName ?? '',
            entry.reason,
            entry.actorId
          )
        )
      : [
          event(
            detail.status === 'PendingSourceAcceptance' || detail.status === 'Rejected'
              ? 'Gửi yêu cầu tới kho xuất'
              : detail.approvedAt
                ? 'Gửi yêu cầu'
                : 'Gửi yêu cầu và giữ chỗ tồn kho',
            detail.submittedAt,
            detail.createdByName ?? ''
          ),
          event('Kho xuất chấp nhận và giữ chỗ', detail.approvedAt),
        ]),
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
