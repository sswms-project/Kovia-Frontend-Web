import { PackageCheck, PackageSearch, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferShipment } from '../../types/transfer.types'
import type { ShipmentCapabilities } from '../../utils/transfer-capabilities'
import { SHIPMENT_LINE_STATUS_LABELS, TASK_EXECUTION_LABELS } from '../../utils/transfer-format'
import { ShipmentStatusBadge } from '../TransfersPage'

export type TransferTaskKind = 'pick' | 'receive' | 'putaway'

interface TransferShipmentsPanelProps {
  readonly transferId: string
  readonly shipments: readonly TransferShipment[]
  readonly capabilities: Readonly<Record<string, ShipmentCapabilities>>
  readonly onCancelShipment: (shipment: TransferShipment) => void
  readonly onConfirmDeparture: (shipment: TransferShipment) => void
  readonly onReopenPicking: (shipment: TransferShipment) => void
  readonly onAssignTask: (shipment: TransferShipment, kind: TransferTaskKind) => void
  readonly onResolveEscalation: (shipment: TransferShipment) => void
  readonly onStartReceiving?: (shipment: TransferShipment) => void
  readonly isStartingReceive?: boolean
  /** ĐVT chính và quy đổi của từng dòng hàng theo mã dòng phiếu; số lượng trong bảng tính theo ĐVT chính. */
  readonly unitsByItem: Readonly<Record<string, { unit: string; conversion: string | null }>>
  readonly mode?: 'pick' | 'receive' | 'putaway'
  readonly planLabels?: Readonly<Record<string, string>>
  readonly onOpenPlan?: () => void
  readonly currentUserId?: string | null
}

/** Mã công việc kho (TPK-…) chỉ dùng nội bộ nên không hiện; người xem cần biết việc đang ở đâu và giao cho ai. */
function taskSummary(
  label: string,
  hasTask: boolean,
  status: string | null,
  assigneeId: string | null,
  assigneeName?: string | null
) {
  if (!hasTask) return null
  return (
    <p className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      {status ? (TASK_EXECUTION_LABELS[status] ?? status) : '—'} ·{' '}
      {assigneeId ? `Giao cho ${assigneeName ?? 'nhân viên'}` : 'Chưa giao nhân viên'}
    </p>
  )
}

export function TransferShipmentsPanel({
  transferId,
  shipments,
  capabilities,
  onCancelShipment,
  onConfirmDeparture,
  onReopenPicking,
  onAssignTask,
  onResolveEscalation,
  unitsByItem,
  mode = 'pick',
  planLabels = {},
  onOpenPlan,
  currentUserId,
  onStartReceiving,
  isStartingReceive,
}: TransferShipmentsPanelProps) {
  if (shipments.length === 0) {
    return (
      <Empty className="border-0 p-6">
        <EmptyHeader>
          <EmptyTitle>Chưa có đợt xuất</EmptyTitle>
          <EmptyDescription>
            Quản lý kho xuất chia hàng thành các đợt và giao nhân viên lấy hàng.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <>
      {mode === 'receive' && onOpenPlan ? (
        <div className="border-b p-3">
          <Button type="button" variant="outline" onClick={onOpenPlan}>
            Kế hoạch cất hàng
          </Button>
        </div>
      ) : null}
      <ul className="divide-border flex flex-col divide-y">
        {shipments.map((shipment) => {
          const allowed = capabilities[shipment.id]
          return (
            <li key={shipment.id}>
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <h3 className="text-sm font-semibold">Đợt {shipment.shipmentNumber}</h3>
                <ShipmentStatusBadge status={shipment.status} />
                <span className="text-muted-foreground text-xs">
                  Tạo {formatOperationalDateTime(shipment.createdAt)}
                </span>
                {shipment.dispatchedAt ? (
                  <span className="text-muted-foreground text-xs">
                    · Xuất {formatOperationalDateTime(shipment.dispatchedAt)}
                  </span>
                ) : null}
                {shipment.receivedAt ? (
                  <span className="text-muted-foreground text-xs">
                    · Nhận {formatOperationalDateTime(shipment.receivedAt)}
                  </span>
                ) : null}
              </div>
              <div>
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã hàng</TableHead>
                      <TableHead>Tên hàng</TableHead>
                      <TableHead>ĐVT</TableHead>
                      <TableHead>ĐVQĐ</TableHead>
                      <TableHead className="text-right">Kế hoạch</TableHead>
                      <TableHead className="text-right">Đã lấy</TableHead>
                      <TableHead className="text-right">Đã xuất</TableHead>
                      <TableHead>Tình trạng</TableHead>
                      {mode === 'receive' ? <TableHead>Kế hoạch cất hàng</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.lines.map((line) => {
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono">{line.sku}</TableCell>
                          <TableCell className="whitespace-normal">{line.productName}</TableCell>
                          <TableCell>{unitsByItem[line.itemId]?.unit ?? '—'}</TableCell>
                          <TableCell>{unitsByItem[line.itemId]?.conversion ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantity(line.plannedQuantity)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantity(line.pickedQuantity + line.dispatchedQuantity)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantity(line.dispatchedQuantity)}
                          </TableCell>
                          <TableCell>
                            {SHIPMENT_LINE_STATUS_LABELS[line.status]}
                            {line.pendingReturnQuantity > 0
                              ? ` · cần trả ${formatQuantity(line.pendingReturnQuantity)}`
                              : ''}
                          </TableCell>
                          {mode === 'receive' ? (
                            <TableCell className="max-w-72 break-words whitespace-normal">
                              {planLabels[line.itemId] || 'Chưa có kế hoạch'}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  {mode === 'putaway' ? (
                    <p className="text-sm tabular-nums">
                      Đã nhận {formatQuantity(shipment.receivedPhysicalQuantity ?? 0)} · Đã cất{' '}
                      {formatQuantity(shipment.putAwayQuantity ?? 0)} · Chưa cất{' '}
                      {formatQuantity(shipment.pendingPutAwayQuantity ?? 0)}
                    </p>
                  ) : null}
                  {taskSummary(
                    'Cất hàng',
                    Boolean(shipment.putAwayTaskId),
                    shipment.putAwayTaskStatus ?? null,
                    shipment.putAwayAssigneeId ?? null,
                    shipment.putAwayAssigneeName
                  )}
                  {taskSummary(
                    'Lấy hàng',
                    Boolean(shipment.pickTaskCode),
                    shipment.pickTaskStatus,
                    shipment.pickAssigneeId,
                    shipment.pickAssigneeName
                  )}
                  {taskSummary(
                    'Nhận hàng',
                    Boolean(shipment.receiveTaskCode),
                    shipment.receiveTaskStatus,
                    shipment.receiveAssigneeId,
                    shipment.receiveAssigneeName
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mode === 'putaway' && allowed?.canAssignPutAway && shipment.putAwayTaskId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssignTask(shipment, 'putaway')}
                    >
                      <UserPlus aria-hidden="true" />
                      {shipment.putAwayAssigneeId ? 'Giao lại việc cất' : 'Giao việc cất hàng'}
                    </Button>
                  ) : null}
                  {mode === 'putaway' ? (
                    <Button
                      asChild
                      variant={allowed?.canOpenPutAway ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Link href={APP_ROUTES.transferPutAwayTask(transferId, shipment.id)}>
                        {allowed?.canOpenPutAway ? 'Cất hàng' : 'Xem cất hàng'}
                      </Link>
                    </Button>
                  ) : null}
                  {mode === 'pick' && allowed?.canResolveEscalation ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveEscalation(shipment)}
                    >
                      Xử lý báo cáo lấy hàng
                    </Button>
                  ) : null}
                  {mode === 'pick' && allowed?.canAssignPick && shipment.pickTaskId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAssignTask(shipment, 'pick')}
                    >
                      <UserPlus aria-hidden="true" />
                      {shipment.pickAssigneeId ? 'Giao lại việc lấy' : 'Giao việc lấy hàng'}
                    </Button>
                  ) : null}
                  {mode === 'receive' && allowed?.canAssignReceive && shipment.receiveTaskId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAssignTask(shipment, 'receive')}
                    >
                      <UserPlus aria-hidden="true" />
                      {shipment.receiveAssigneeId ? 'Giao lại việc nhận' : 'Giao việc nhận hàng'}
                    </Button>
                  ) : null}
                  {mode === 'pick' &&
                  allowed?.canOpenPick &&
                  shipment.pickAssigneeId === currentUserId ? (
                    <Button asChild size="sm">
                      <Link href={APP_ROUTES.transferPickTask(transferId, shipment.id)}>
                        <PackageSearch aria-hidden="true" />
                        Lấy hàng
                      </Link>
                    </Button>
                  ) : null}
                  {mode === 'receive' &&
                  allowed?.canOpenReceive &&
                  shipment.status === 'InTransit' &&
                  onStartReceiving ? (
                    <Button
                      size="sm"
                      disabled={isStartingReceive}
                      onClick={() => onStartReceiving(shipment)}
                    >
                      <PackageCheck aria-hidden="true" />
                      {isStartingReceive ? 'Đang bắt đầu…' : 'Nhận hàng'}
                    </Button>
                  ) : null}
                  {mode === 'receive' && shipment.status !== 'InTransit' ? (
                    <Button asChild size="sm">
                      <Link href={APP_ROUTES.transferReceiveTask(transferId, shipment.id)}>
                        <PackageCheck aria-hidden="true" />
                        {allowed?.canOpenReceive ? 'Tiếp tục kiểm hàng' : 'Xem phiếu nhập'}
                      </Link>
                    </Button>
                  ) : null}
                  {mode === 'pick' && allowed?.canConfirmDeparture ? (
                    <Button type="button" size="sm" onClick={() => onConfirmDeparture(shipment)}>
                      <PackageCheck aria-hidden="true" />
                      Xác nhận đã xuất kho
                    </Button>
                  ) : null}
                  {mode === 'pick' && allowed?.canReopenPicking ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onReopenPicking(shipment)}
                    >
                      Mở lại lấy hàng
                    </Button>
                  ) : null}
                  {mode === 'pick' && allowed?.canCancel ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancelShipment(shipment)}
                    >
                      Hủy đợt
                    </Button>
                  ) : null}
                </div>
              </div>
              {shipment.cancellationReason ? (
                <p className="text-muted-foreground border-t px-3 py-2 text-xs">
                  Lý do hủy đợt: {shipment.cancellationReason}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}
