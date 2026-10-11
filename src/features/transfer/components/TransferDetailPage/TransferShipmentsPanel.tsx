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

export type TransferTaskKind = 'pick' | 'receive'

interface TransferShipmentsPanelProps {
  readonly transferId: string
  readonly shipments: readonly TransferShipment[]
  readonly capabilities: Readonly<Record<string, ShipmentCapabilities>>
  readonly onCancelShipment: (shipment: TransferShipment) => void
  readonly onConfirmDeparture: (shipment: TransferShipment) => void
  readonly onReopenPicking: (shipment: TransferShipment) => void
  readonly onAssignTask: (shipment: TransferShipment, kind: TransferTaskKind) => void
  readonly onResolveEscalation: (shipment: TransferShipment) => void
}

function taskSummary(
  label: string,
  code: string | null,
  status: string | null,
  assigneeId: string | null,
  assigneeName?: string | null
) {
  if (!code) return null
  return (
    <p className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono">{code}</span> ·{' '}
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
    <ul className="flex flex-col gap-4 p-3">
      {shipments.map((shipment) => {
        const allowed = capabilities[shipment.id]
        return (
          <li key={shipment.id} className="border">
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
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Tên hàng</TableHead>
                    <TableHead className="text-right">Kế hoạch</TableHead>
                    <TableHead className="text-right">Đã lấy</TableHead>
                    <TableHead className="text-right">Đã xuất</TableHead>
                    <TableHead>Tình trạng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono">{line.sku}</TableCell>
                      <TableCell className="whitespace-normal">{line.productName}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
              <div className="flex flex-col gap-0.5">
                {taskSummary(
                  'Lấy hàng',
                  shipment.pickTaskCode,
                  shipment.pickTaskStatus,
                  shipment.pickAssigneeId,
                  shipment.pickAssigneeName
                )}
                {taskSummary(
                  'Nhận hàng',
                  shipment.receiveTaskCode,
                  shipment.receiveTaskStatus,
                  shipment.receiveAssigneeId,
                  shipment.receiveAssigneeName
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allowed?.canResolveEscalation ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveEscalation(shipment)}
                  >
                    Xử lý báo cáo lấy hàng
                  </Button>
                ) : null}
                {allowed?.canAssignPick && shipment.pickTaskId ? (
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
                {allowed?.canAssignReceive && shipment.receiveTaskId ? (
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
                {allowed?.canOpenPick ? (
                  <Button asChild size="sm">
                    <Link href={APP_ROUTES.transferPickTask(transferId, shipment.id)}>
                      <PackageSearch aria-hidden="true" />
                      Lấy hàng
                    </Link>
                  </Button>
                ) : null}
                {allowed?.canOpenReceive ? (
                  <Button asChild size="sm">
                    <Link href={APP_ROUTES.transferReceiveTask(transferId, shipment.id)}>
                      <PackageCheck aria-hidden="true" />
                      Nhận hàng
                    </Link>
                  </Button>
                ) : null}
                {allowed?.canConfirmDeparture ? (
                  <Button type="button" size="sm" onClick={() => onConfirmDeparture(shipment)}>
                    <PackageCheck aria-hidden="true" />
                    Xác nhận đã xuất kho
                  </Button>
                ) : null}
                {allowed?.canReopenPicking ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onReopenPicking(shipment)}
                  >
                    Mở lại lấy hàng
                  </Button>
                ) : null}
                {allowed?.canCancel ? (
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
  )
}
