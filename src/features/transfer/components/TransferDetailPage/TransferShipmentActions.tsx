import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferShipment } from '../../types/transfer.types'
import type { ShipmentCapabilities } from '../../utils/transfer-capabilities'
import type { TransferNextStep, TransferNextStepAction } from '../../utils/transfer-next-steps'
import type { TransferTaskKind } from './TransferShipmentsPanel'

interface Props {
  readonly transferId: string
  readonly shipment: TransferShipment
  readonly allowed?: ShipmentCapabilities
  readonly steps: readonly TransferNextStep[]
  readonly onAction: (action: TransferNextStepAction) => void
  readonly onAssign: (shipment: TransferShipment, kind: TransferTaskKind) => void
  readonly onCancel: (shipment: TransferShipment) => void
  readonly onReopen: (shipment: TransferShipment) => void
  readonly onOpenPlan?: () => void
  readonly isStartingReceive?: boolean
}

/** Mỗi đợt chỉ có một hành động chính; thao tác ngoại lệ không chen vào luồng thường. */
export function TransferShipmentActions({
  transferId,
  shipment,
  allowed,
  steps,
  onAction,
  onAssign,
  onCancel,
  onReopen,
  onOpenPlan,
  isStartingReceive,
}: Props) {
  const step = steps.find(
    ({ action }) =>
      ('shipment' in action
        ? action.shipment.id
        : 'shipmentId' in action
          ? action.shipmentId
          : null) === shipment.id
  )
  const action = step?.action
  const primaryHref =
    action?.type === 'openPick'
      ? APP_ROUTES.transferPickTask(transferId, shipment.id)
      : action?.type === 'openReceive'
        ? APP_ROUTES.transferReceiveTask(transferId, shipment.id)
        : action?.type === 'openPutAway'
          ? APP_ROUTES.transferPutAwayTask(transferId, shipment.id)
          : null
  const picking = shipment.status === 'Picking' || shipment.status === 'ReadyToDispatch'
  const canViewReceipt = Boolean(
    shipment.dispatchedAt || shipment.lines.some((line) => line.dispatchedQuantity > 0)
  )
  const canViewPutAway =
    [1, 2].includes(shipment.receiptFlowVersion ?? 0) && Boolean(shipment.putAwayTaskId)
  const hasOtherActions = Boolean(
    (picking && allowed?.canViewPick) ||
    (canViewReceipt && allowed?.canViewReceive) ||
    (canViewPutAway && allowed?.canViewPutAway) ||
    (allowed?.canAssignPick && shipment.pickTaskId) ||
    (allowed?.canAssignReceive && shipment.receiveTaskId) ||
    (allowed?.canAssignPutAway && shipment.putAwayTaskId) ||
    onOpenPlan ||
    allowed?.canReopenPicking ||
    allowed?.canCancel
  )
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {step && action ? (
        primaryHref ? (
          <Button asChild size="sm">
            <Link href={primaryHref}>{step.actionLabel}</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={action.type === 'startReceiving' && isStartingReceive}
            onClick={() => onAction(action)}
          >
            {step.actionLabel}
          </Button>
        )
      ) : null}
      {hasOtherActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Thao tác khác đợt ${shipment.shipmentNumber}`}
            >
              <MoreHorizontal aria-hidden="true" />
              Thao tác khác
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuGroup>
              {picking && allowed?.canViewPick ? (
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.transferPickTask(transferId, shipment.id)}>
                    Xem lấy hàng
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canViewReceipt && allowed?.canViewReceive ? (
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.transferReceiveTask(transferId, shipment.id)}>
                    Xem kiểm nhận
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canViewPutAway && allowed?.canViewPutAway ? (
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.transferPutAwayTask(transferId, shipment.id)}>
                    Xem cất hàng
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {allowed?.canAssignPick && shipment.pickTaskId ? (
                <DropdownMenuItem onSelect={() => onAssign(shipment, 'pick')}>
                  {shipment.pickAssigneeId ? 'Giao lại việc lấy hàng' : 'Giao việc lấy hàng'}
                </DropdownMenuItem>
              ) : null}
              {allowed?.canAssignReceive && shipment.receiveTaskId ? (
                <DropdownMenuItem onSelect={() => onAssign(shipment, 'receive')}>
                  Giao việc nhận và cất hàng
                </DropdownMenuItem>
              ) : null}
              {allowed?.canAssignPutAway && shipment.putAwayTaskId ? (
                <DropdownMenuItem onSelect={() => onAssign(shipment, 'putaway')}>
                  Giao việc cất hàng
                </DropdownMenuItem>
              ) : null}
              {onOpenPlan ? (
                <DropdownMenuItem onSelect={onOpenPlan}>Kế hoạch cất hàng</DropdownMenuItem>
              ) : null}
              {allowed?.canReopenPicking ? (
                <DropdownMenuItem onSelect={() => onReopen(shipment)}>
                  Mở lại lấy hàng
                </DropdownMenuItem>
              ) : null}
              {allowed?.canCancel ? (
                <DropdownMenuItem variant="destructive" onSelect={() => onCancel(shipment)}>
                  Hủy đợt
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
