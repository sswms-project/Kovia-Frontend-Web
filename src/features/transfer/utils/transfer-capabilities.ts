import { P } from '@/config/permissionCodes'
import type {
  TransferDetail,
  TransferDiscrepancy,
  TransferFeedback,
  TransferItem,
  TransferShipment,
} from '../types/transfer.types'

export interface TransferViewer {
  readonly permissions: readonly string[]
  readonly currentUserId: string | null
  /** Chủ doanh nghiệp được sửa/hủy mọi phiếu; người khác chỉ phiếu do mình tạo (BE kiểm lại). */
  readonly isTenantOwner: boolean
  /** Kho người xem được gán; bỏ trống nghĩa là không giới hạn theo kho (BE vẫn kiểm lại). */
  readonly warehouseIds?: readonly string[]
}

/** Kho của phiếu: kho xuất giao việc lấy hàng, kho nhập giao việc nhận hàng. */
export interface TransferWarehouses {
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
}

export type TransferClosingAction = 'cancel' | 'stop' | null

export interface TransferCapabilities {
  readonly canDecideRequest: boolean
  readonly canWithdrawRequest: boolean
  readonly canEditDraft: boolean
  readonly canEdit: boolean
  readonly canGiveFeedback: boolean
  readonly canReplyFeedback: boolean
  readonly canCreateShipment: boolean
  readonly canResolveDiscrepancy: boolean
  /** Chủ và quản lý kho xuất đổi nơi lấy hàng của các dòng đang giữ chỗ. */
  readonly canAdjustAllocation: boolean
  /** Quản lý kho nhập (và chủ) chọn vị trí cất hàng cho các dòng chưa bắt đầu nhận. */
  readonly canSetPutAwaySlots: boolean
  /** UI chỉ hiện một nút: Hủy phiếu khi chưa xuất đợt nào, Dừng phần còn lại khi đã xuất. */
  readonly closingAction: TransferClosingAction
}

export interface ShipmentCapabilities {
  readonly canViewPick?: boolean
  readonly canViewReceive?: boolean
  readonly canViewPutAway?: boolean
  readonly canOpenPutAway?: boolean
  readonly canAssignPutAway?: boolean
  readonly canCancel: boolean
  readonly canOpenPick: boolean
  /** Quản lý kho xuất xác nhận xe đã rời kho (trừ tồn). */
  readonly canConfirmDeparture: boolean
  /** Quản lý mở lại lấy hàng khi đợt đang chờ xuất. */
  readonly canReopenPicking: boolean
  readonly canOpenReceive: boolean
  /** Quản lý kho xuất giao việc lấy hàng. */
  readonly canAssignPick: boolean
  /** Quản lý kho nhập giao việc nhận hàng. */
  readonly canAssignReceive: boolean
  readonly canResolveEscalation: boolean
}

/** Một lối giao việc ở kho nhập; sau khi kiểm nhận xong chỉ còn giao việc cất. */
export function getDestinationAssignmentKind(
  shipment: TransferShipment,
  allowed: ShipmentCapabilities | undefined
): 'receive' | 'putaway' | null {
  if (allowed?.canAssignReceive && shipment.receiveTaskId) return 'receive'
  if (allowed?.canAssignPutAway && shipment.putAwayTaskId) return 'putaway'
  return null
}

const NONE: TransferCapabilities = {
  canDecideRequest: false,
  canWithdrawRequest: false,
  canEditDraft: false,
  canEdit: false,
  canGiveFeedback: false,
  canReplyFeedback: false,
  canCreateShipment: false,
  canResolveDiscrepancy: false,
  canAdjustAllocation: false,
  canSetPutAwaySlots: false,
  closingAction: null,
}

function has(viewer: TransferViewer, permission: string) {
  return viewer.permissions.includes(permission)
}

/** Người xem thuộc kho này (chủ doanh nghiệp, hoặc kho nằm trong danh sách được phân công). */
export function canSeeWarehouse(viewer: TransferViewer, warehouseId: string | undefined) {
  return manages(viewer, warehouseId)
}

function manages(viewer: TransferViewer, warehouseId: string | undefined) {
  if (viewer.isTenantOwner || !viewer.warehouseIds || !warehouseId) return true
  return viewer.warehouseIds.includes(warehouseId)
}

export function hasDispatchedAny(transfer: Pick<TransferDetail, 'items'>) {
  return transfer.items.some((item) => item.dispatchedQuantity > 0)
}

/** Số lượng (theo ĐVT chính) chưa xuất và chưa bị dừng của cả phiếu. */
export function remainingQuantity(transfer: Pick<TransferDetail, 'items'>) {
  return transfer.items.reduce(
    (total, item) =>
      total + Math.max(0, item.quantity - item.stoppedQuantity - item.dispatchedQuantity),
    0
  )
}

export function unbatchedQuantity(transfer: Pick<TransferDetail, 'items'>) {
  return transfer.items.reduce((total, item) => total + Math.max(0, item.unbatchedQuantity), 0)
}

export function hasOpenFeedback(feedbacks: readonly TransferFeedback[] | null | undefined) {
  return (feedbacks ?? []).some((feedback) => feedback.status !== 'Closed')
}

export function openDiscrepancies(
  discrepancies: readonly TransferDiscrepancy[] | null | undefined
) {
  return (discrepancies ?? []).filter((discrepancy) => discrepancy.isOpen)
}

/** Khả năng hiển thị theo quyền hiệu lực và trạng thái; BE vẫn kiểm lại mọi thao tác. */
export function getTransferCapabilities(
  viewer: TransferViewer,
  transfer: TransferDetail | null | undefined
): TransferCapabilities {
  if (!transfer || transfer.isLegacyWorkflow) return NONE

  const canCreate = has(viewer, P.TRANSFERS_CREATE)
  const canCancel = has(viewer, P.TRANSFERS_CANCEL)
  const isCreator = transfer.createdBy === viewer.currentUserId
  const isOwnDraft = transfer.status === 'Draft' && isCreator
  const isInProgress = transfer.status === 'InProgress'
  const isOpen = isInProgress || transfer.status === 'AwaitingResolution'
  const mayChange = viewer.isTenantOwner || isCreator
  const dispatched = hasDispatchedAny(transfer)

  let closingAction: TransferClosingAction = null
  if (canCancel && isOwnDraft) closingAction = 'cancel'
  else if (canCancel && mayChange && isInProgress && !dispatched) closingAction = 'cancel'
  else if (canCancel && mayChange && isInProgress && dispatched && remainingQuantity(transfer) > 0)
    closingAction = 'stop'

  return {
    canDecideRequest:
      transfer.status === 'PendingSourceAcceptance' &&
      has(viewer, P.TRANSFERS_DISPATCH) &&
      manages(viewer, transfer.sourceWarehouseId),
    canWithdrawRequest:
      ['PendingSourceAcceptance', 'Rejected', 'InProgress'].includes(transfer.status) &&
      !transfer.shipments?.length &&
      !transfer.hasOpenFeedback &&
      !hasOpenFeedback(transfer.feedbacks) &&
      !transfer.dispatchedAt &&
      !transfer.receivedAt &&
      transfer.items.every(
        (item) =>
          item.batchedQuantity === 0 &&
          item.pickedQuantity === 0 &&
          item.dispatchedQuantity === 0 &&
          item.receivedQuantity === 0 &&
          item.damagedQuantity === 0 &&
          item.missingQuantity === 0 &&
          (item.putAwayQuantity ?? 0) === 0 &&
          item.stoppedQuantity === 0
      ) &&
      canCreate &&
      isCreator &&
      manages(viewer, transfer.destinationWarehouseId),
    canEditDraft: canCreate && isOwnDraft && manages(viewer, transfer.destinationWarehouseId),
    canEdit:
      canCreate &&
      mayChange &&
      isInProgress &&
      !transfer.approvedAt &&
      !transfer.shipments?.length &&
      transfer.items.every(
        (item) =>
          item.pickedQuantity === 0 &&
          item.dispatchedQuantity === 0 &&
          item.receivedQuantity === 0 &&
          item.damagedQuantity === 0 &&
          item.missingQuantity === 0 &&
          (item.putAwayQuantity ?? 0) === 0 &&
          item.stoppedQuantity === 0
      ),
    canGiveFeedback:
      isOpen &&
      ((has(viewer, P.TRANSFERS_DISPATCH) && manages(viewer, transfer.sourceWarehouseId)) ||
        (has(viewer, P.TRANSFERS_RECEIVE) && manages(viewer, transfer.destinationWarehouseId))),
    canReplyFeedback: canCreate && isOpen && hasOpenFeedback(transfer.feedbacks),
    canCreateShipment:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      manages(viewer, transfer.sourceWarehouseId) &&
      isInProgress &&
      unbatchedQuantity(transfer) > 0,
    canResolveDiscrepancy:
      has(viewer, P.TRANSFERS_RESOLVE) &&
      manages(viewer, transfer.destinationWarehouseId) &&
      openDiscrepancies(transfer.discrepancies).length > 0,
    canAdjustAllocation:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      manages(viewer, transfer.sourceWarehouseId) &&
      isInProgress &&
      transfer.items.some((item) => (item.allocations ?? []).length > 0),
    canSetPutAwaySlots:
      has(viewer, P.TRANSFERS_RECEIVE) &&
      manages(viewer, transfer.destinationWarehouseId) &&
      isOpen &&
      transfer.items.some((item) => item.quantity > item.stoppedQuantity),
    closingAction,
  }
}

/** Dòng chưa có khai báo nhận mới đổi được vị trí cất hàng (cùng quy tắc khóa với BE). */
export function canChoosePutAwaySlot(item: TransferItem) {
  return item.receivedQuantity === 0 && item.damagedQuantity === 0 && item.missingQuantity === 0
}

export function canHandleTransferPutAway(
  viewer: TransferViewer,
  assigneeId: string | null | undefined,
  warehouseId: string | undefined
) {
  return (
    has(viewer, P.TRANSFERS_RECEIVE) &&
    (has(viewer, P.WAREHOUSE_TASKS_ASSIGN) ||
      (viewer.currentUserId !== null && assigneeId === viewer.currentUserId)) &&
    manages(viewer, warehouseId)
  )
}

export function getShipmentCapabilities(
  viewer: TransferViewer,
  shipment: Pick<TransferShipment, 'status' | 'lines'> &
    Partial<Pick<TransferShipment, 'pickAssigneeId' | 'receiveAssigneeId' | 'putAwayAssigneeId'>>,
  warehouses?: TransferWarehouses
): ShipmentCapabilities {
  const isPicking = shipment.status === 'Picking'
  const isReady = shipment.status === 'ReadyToDispatch'
  const isReceivable = shipment.status === 'InTransit' || shipment.status === 'Receiving'
  // BE chỉ cho người được giao việc hoặc người quản lý kho nhập (có quyền giao việc) thao tác nhận và cất.
  const isAssignedTo = (assigneeId: string | null | undefined) =>
    viewer.currentUserId !== null && assigneeId === viewer.currentUserId
  const canManageTasks = has(viewer, P.WAREHOUSE_TASKS_ASSIGN)
  return {
    canViewPick: has(viewer, P.TRANSFERS_VIEW) && manages(viewer, warehouses?.sourceWarehouseId),
    canViewReceive:
      has(viewer, P.TRANSFERS_VIEW) && manages(viewer, warehouses?.destinationWarehouseId),
    canViewPutAway:
      has(viewer, P.TRANSFERS_VIEW) && manages(viewer, warehouses?.destinationWarehouseId),
    canOpenPutAway:
      shipment.status === 'AwaitingPutAway' &&
      canHandleTransferPutAway(
        viewer,
        shipment.putAwayAssigneeId,
        warehouses?.destinationWarehouseId
      ),
    canAssignPutAway:
      has(viewer, P.WAREHOUSE_TASKS_ASSIGN) &&
      has(viewer, P.TRANSFERS_RECEIVE) &&
      (isReceivable || shipment.status === 'AwaitingPutAway') &&
      manages(viewer, warehouses?.destinationWarehouseId),
    canCancel:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      isPicking &&
      manages(viewer, warehouses?.sourceWarehouseId),
    canOpenPick:
      has(viewer, P.TRANSFERS_PICK) &&
      isPicking &&
      (isAssignedTo(shipment.pickAssigneeId) ||
        has(viewer, P.TRANSFERS_DISPATCH) ||
        viewer.isTenantOwner) &&
      manages(viewer, warehouses?.sourceWarehouseId),
    canConfirmDeparture:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      isReady &&
      manages(viewer, warehouses?.sourceWarehouseId),
    canReopenPicking:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      isReady &&
      manages(viewer, warehouses?.sourceWarehouseId),
    // Nhận hàng là việc của kho nhập: người của kho xuất không mở được dù có quyền nhận.
    canOpenReceive:
      has(viewer, P.TRANSFERS_RECEIVE) &&
      isReceivable &&
      (canManageTasks || isAssignedTo(shipment.receiveAssigneeId)) &&
      manages(viewer, warehouses?.destinationWarehouseId),
    canAssignPick:
      has(viewer, P.WAREHOUSE_TASKS_ASSIGN) &&
      has(viewer, P.TRANSFERS_DISPATCH) &&
      isPicking &&
      manages(viewer, warehouses?.sourceWarehouseId),
    canAssignReceive:
      has(viewer, P.WAREHOUSE_TASKS_ASSIGN) &&
      has(viewer, P.TRANSFERS_RECEIVE) &&
      isReceivable &&
      manages(viewer, warehouses?.destinationWarehouseId),
    canResolveEscalation:
      has(viewer, P.TRANSFERS_DISPATCH) &&
      isPicking &&
      manages(viewer, warehouses?.sourceWarehouseId) &&
      shipment.lines.some((line) => line.status === 'PendingManager'),
  }
}
