import type { TransferDetail, TransferShipment } from '../types/transfer.types'
import {
  openDiscrepancies,
  getDestinationAssignmentKind,
  type ShipmentCapabilities,
  type TransferCapabilities,
  type TransferViewer,
} from './transfer-capabilities'

export type TransferNextStepAction =
  | { readonly type: 'createShipment' }
  | { readonly type: 'adjustAllocation' }
  | { readonly type: 'openPutAwayPlan' }
  | {
      readonly type: 'assign'
      readonly kind: 'pick' | 'receive' | 'putaway'
      readonly shipment: TransferShipment
    }
  | { readonly type: 'openPick'; readonly shipmentId: string }
  | { readonly type: 'confirmDeparture'; readonly shipment: TransferShipment }
  | { readonly type: 'openReceive'; readonly shipmentId: string }
  | { readonly type: 'startReceiving'; readonly shipment: TransferShipment }
  | { readonly type: 'openPutAway'; readonly shipmentId: string }
  | { readonly type: 'resolveDiscrepancy' }
  | { readonly type: 'resolveEscalation'; readonly shipment: TransferShipment }

export interface TransferNextStep {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly actionLabel: string
  readonly action: TransferNextStepAction
}

/**
 * Việc người xem cần làm tiếp trên phiếu, theo vai trò và kho của họ. Chỉ liệt kê việc có
 * thao tác ngay được; BE vẫn kiểm lại quyền và kho khi thực hiện.
 */
export function getTransferNextSteps(
  viewer: TransferViewer,
  transfer: TransferDetail,
  capabilities: TransferCapabilities,
  shipmentCapabilities: Readonly<Record<string, ShipmentCapabilities | undefined>>
): TransferNextStep[] {
  if (transfer.isLegacyWorkflow) return []
  const steps: TransferNextStep[] = []

  if (capabilities.canCreateShipment) {
    const hasShipment = (transfer.shipments ?? []).some(
      (shipment) => shipment.status !== 'Cancelled'
    )
    steps.push({
      id: 'create-shipment',
      title: hasShipment ? 'Còn hàng chưa chia vào đợt xuất' : 'Chưa có đợt xuất',
      description:
        'Xuất toàn bộ phần còn lại trong một chuyến và chọn người lấy hàng; chia nhiều chuyến khi cần.',
      actionLabel: 'Chuẩn bị xuất',
      action: { type: 'createShipment' },
    })
  }

  for (const shipment of transfer.shipments ?? []) {
    const allowed = shipmentCapabilities[shipment.id]
    if (!allowed) continue
    const label = `Đợt ${shipment.shipmentNumber}`
    if (allowed.canAssignPick && shipment.pickTaskId && !shipment.pickAssigneeId) {
      steps.push({
        id: `assign-pick-${shipment.id}`,
        title: `${label} chưa giao người lấy hàng`,
        description: 'Giao việc cho nhân viên kho xuất để họ lấy và quét hàng.',
        actionLabel: 'Giao việc lấy hàng',
        action: { type: 'assign', kind: 'pick', shipment },
      })
    }
    if (allowed.canOpenPick && shipment.pickAssigneeId === viewer.currentUserId) {
      steps.push({
        id: `open-pick-${shipment.id}`,
        title: `${label} đang chờ bạn lấy hàng`,
        description: 'Mở màn lấy hàng để quét vị trí, quét hàng và xác nhận số lượng.',
        actionLabel: 'Mở màn lấy hàng',
        action: { type: 'openPick', shipmentId: shipment.id },
      })
    }
    if (allowed.canResolveEscalation) {
      const waiting = shipment.lines.filter((line) => line.status === 'PendingManager').length
      steps.push({
        id: `resolve-escalation-${shipment.id}`,
        title: `${label} có ${waiting} báo cáo lấy hàng chờ bạn xử lý`,
        description:
          'Nhân viên báo thiếu hàng hoặc gặp vấn đề khi lấy. Chọn vị trí thay thế, giảm số lượng của đợt hoặc dừng dòng đó.',
        actionLabel: 'Xử lý báo cáo',
        action: { type: 'resolveEscalation', shipment },
      })
    }
    if (allowed.canConfirmDeparture) {
      steps.push({
        id: `confirm-departure-${shipment.id}`,
        title: `${label} đã lấy xong, chờ xe rời kho`,
        description:
          'Khi xe đã rời kho, xác nhận xuất kho để trừ tồn và chuyển cho kho nhập nhận hàng.',
        actionLabel: 'Xác nhận đã xuất kho',
        action: { type: 'confirmDeparture', shipment },
      })
    }
    const destinationAssignmentKind = getDestinationAssignmentKind(shipment, allowed)
    if (destinationAssignmentKind === 'receive' && !shipment.receiveAssigneeId) {
      steps.push({
        id: `assign-receive-${shipment.id}`,
        title: `${label} · Chưa giao việc tại kho nhập`,
        description: shipment.putAwayTaskId
          ? 'Chọn cùng người kiểm nhận và cất hàng; có thể giao riêng khi cần.'
          : 'Giao người kiểm nhận trước. Công việc cất được tạo khi bắt đầu nhận hàng.',
        actionLabel: 'Giao việc nhận và cất hàng',
        action: { type: 'assign', kind: 'receive', shipment },
      })
    }
    if (
      allowed.canOpenReceive &&
      (shipment.receiveAssigneeId === viewer.currentUserId || !shipment.receiveAssigneeId)
    ) {
      steps.push({
        id: `open-receive-${shipment.id}`,
        title: `${label} đang chờ bạn kiểm nhận hàng`,
        description: 'Kiểm số tốt, hỏng, thiếu và nộp phiếu; chưa ghi tồn kho ở bước này.',
        actionLabel: shipment.status === 'InTransit' ? 'Kiểm nhận hàng' : 'Tiếp tục kiểm hàng',
        action:
          shipment.status === 'InTransit'
            ? { type: 'startReceiving', shipment }
            : { type: 'openReceive', shipmentId: shipment.id },
      })
    }
    if (destinationAssignmentKind === 'putaway' && !shipment.putAwayAssigneeId) {
      steps.push({
        id: `assign-putaway-${shipment.id}`,
        title: `${label} · Chưa giao người cất`,
        description: 'Giao việc cất riêng hoặc đổi người cùng mức ưu tiên và hạn hoàn thành.',
        actionLabel: 'Giao việc cất hàng',
        action: { type: 'assign', kind: 'putaway', shipment },
      })
    }
    if (
      allowed.canOpenPutAway &&
      (shipment.putAwayAssigneeId === viewer.currentUserId || !shipment.putAwayAssigneeId)
    ) {
      steps.push({
        id: `open-putaway-${shipment.id}`,
        title: `${label} còn hàng đã nhận, chưa cất`,
        description:
          'Quét vị trí và cất hàng tốt. Hàng hỏng, thiếu được xử lý riêng; tồn kho tăng khi xác nhận cất.',
        actionLabel: 'Cất hàng',
        action: { type: 'openPutAway', shipmentId: shipment.id },
      })
    }
  }

  const openCount = openDiscrepancies(transfer.discrepancies).length
  if (capabilities.canResolveDiscrepancy && openCount > 0) {
    steps.push({
      id: 'resolve-discrepancy',
      title: `${openCount} chênh lệch chờ xử lý`,
      description: 'Chọn nhận muộn, điều chỉnh mất hàng hoặc mở ca hàng hỏng cho từng chênh lệch.',
      actionLabel: 'Xem chênh lệch',
      action: { type: 'resolveDiscrepancy' },
    })
  }
  // Một việc chính cho mỗi đợt: báo cáo chặn lấy hàng được ưu tiên; giao việc đứng trước thao tác thay nhân viên.
  const primaryByShipment = new Map<string, TransferNextStep>()
  for (const step of steps) {
    const action = step.action
    const shipmentId =
      'shipment' in action ? action.shipment.id : 'shipmentId' in action ? action.shipmentId : null
    if (shipmentId && (!primaryByShipment.has(shipmentId) || action.type === 'resolveEscalation'))
      primaryByShipment.set(shipmentId, step)
  }
  return steps.filter(({ action, id }) => {
    const shipmentId =
      'shipment' in action ? action.shipment.id : 'shipmentId' in action ? action.shipmentId : null
    return !shipmentId || primaryByShipment.get(shipmentId)?.id === id
  })
}
