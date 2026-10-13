import type { TransferDetail, TransferShipment } from '../types/transfer.types'
import {
  openDiscrepancies,
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
    if (!hasShipment && capabilities.canAdjustAllocation) {
      steps.push({
        id: 'check-allocation',
        title: 'Kiểm tra nơi lấy hàng trước khi tạo đợt',
        description:
          'Hệ thống đã tự phân bổ vị trí và lô theo FEFO. Bạn có thể đổi sang nơi khác nếu cần; không bắt buộc.',
        actionLabel: 'Điều chỉnh phân bổ',
        action: { type: 'adjustAllocation' },
      })
    }
    steps.push({
      id: 'create-shipment',
      title: hasShipment ? 'Còn hàng chưa chia vào đợt xuất' : 'Chưa có đợt xuất',
      description:
        'Chọn dòng hàng và số lượng cho đợt xuất. Hệ thống tạo sẵn công việc lấy hàng để bạn giao cho nhân viên.',
      actionLabel: 'Tạo đợt xuất',
      action: { type: 'createShipment' },
    })
  }

  if (capabilities.canSetPutAwaySlots) {
    const missing = transfer.items.filter(
      (item) => item.quantity > item.stoppedQuantity && (item.putAwayPlan ?? []).length === 0
    ).length
    if (missing > 0) {
      steps.push({
        id: 'set-put-away',
        title: `${missing} dòng hàng chưa có kế hoạch cất`,
        description:
          'Chia số lượng theo vị trí; nhân viên nhận hàng sẽ thấy kế hoạch riêng cho từng lô.',
        actionLabel: 'Lập kế hoạch cất hàng',
        action: { type: 'openPutAwayPlan' },
      })
    }
  }

  for (const shipment of transfer.shipments ?? []) {
    const allowed = shipmentCapabilities[shipment.id]
    if (!allowed) continue
    const label = `Đợt ${shipment.shipmentNumber}`
    if (allowed.canAssignPick && shipment.pickTaskId) {
      steps.push(
        shipment.pickAssigneeId
          ? {
              id: `reassign-pick-${shipment.id}`,
              title: `${label} đã giao cho ${shipment.pickAssigneeName ?? 'nhân viên'} lấy hàng`,
              description: 'Cần đổi người lấy hàng thì giao lại cho nhân viên khác, kèm lý do.',
              actionLabel: 'Giao lại việc lấy',
              action: { type: 'assign', kind: 'pick', shipment },
            }
          : {
              id: `assign-pick-${shipment.id}`,
              title: `${label} chưa giao người lấy hàng`,
              description: 'Giao việc cho nhân viên kho xuất để họ lấy và quét hàng.',
              actionLabel: 'Giao việc lấy hàng',
              action: { type: 'assign', kind: 'pick', shipment },
            }
      )
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
    if (allowed.canAssignReceive && shipment.receiveTaskId) {
      steps.push(
        shipment.receiveAssigneeId
          ? {
              id: `reassign-receive-${shipment.id}`,
              title: `${label} đã giao cho ${shipment.receiveAssigneeName ?? 'nhân viên'} nhận hàng`,
              description: 'Cần đổi người nhận hàng thì giao lại cho nhân viên khác, kèm lý do.',
              actionLabel: 'Giao lại việc nhận',
              action: { type: 'assign', kind: 'receive', shipment },
            }
          : {
              id: `assign-receive-${shipment.id}`,
              title: `${label} đã xuất, chưa giao người nhận hàng`,
              description: 'Giao việc kiểm hàng; có thể giao cùng người cất trong hộp thoại.',
              actionLabel: 'Giao việc nhận hàng',
              action: { type: 'assign', kind: 'receive', shipment },
            }
      )
    }
    if (allowed.canOpenReceive) {
      steps.push({
        id: `open-receive-${shipment.id}`,
        title: `${label} đang chờ bạn nhận hàng`,
        description: 'Kiểm số tốt, hỏng, thiếu và nộp phiếu; chưa ghi tồn kho ở bước này.',
        actionLabel: shipment.status === 'InTransit' ? 'Nhận hàng' : 'Tiếp tục kiểm hàng',
        action:
          shipment.status === 'InTransit'
            ? { type: 'startReceiving', shipment }
            : { type: 'openReceive', shipmentId: shipment.id },
      })
    }
    if (allowed.canAssignPutAway && shipment.putAwayTaskId) {
      steps.push({
        id: `assign-putaway-${shipment.id}`,
        title: `${label} · ${shipment.putAwayAssigneeName ? 'Đã giao cất cho ' + shipment.putAwayAssigneeName : 'Chưa giao người cất'}`,
        description: 'Giao việc cất riêng hoặc đổi người cùng mức ưu tiên và hạn hoàn thành.',
        actionLabel: 'Giao việc cất hàng',
        action: { type: 'assign', kind: 'putaway', shipment },
      })
    }
    if (allowed.canOpenPutAway) {
      steps.push({
        id: `open-putaway-${shipment.id}`,
        title: `${label} còn hàng đã nhận, chưa cất`,
        description: 'Quét vị trí và cất hàng tốt, hàng hỏng riêng. Tồn kho tăng khi xác nhận cất.',
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
  return steps
}
