import { PackageCheck, PackageSearch, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import { TransferSlotMapDialog } from '../TransferFormPage/TransferSlotMapDialog'
import { ShipmentPutAwayCell } from './ShipmentPutAwayCell'
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
  /** Chỉ có khi người xem là quản lý kho nhập được chọn vị trí cất; thêm cột "Cất vào" chọn ngay trong bảng. */
  readonly putAway?: {
    readonly warehouseId: string
    readonly savedSlots: Readonly<Record<string, LookupOption | undefined>>
    readonly editableItemIds: ReadonlySet<string>
    readonly slotOptions: readonly LookupOption[]
    readonly isLoadingSlots: boolean
    readonly isPending: boolean
    readonly onSlotSearchChange: (value: string) => void
    readonly onSave: (itemId: string, slot: LookupOption | undefined) => void
  }
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
  putAway,
}: TransferShipmentsPanelProps) {
  const [mapItemId, setMapItemId] = useState<string | null>(null)
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
                      {putAway ? <TableHead>Cất vào</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.lines.map((line) => {
                      const editable = putAway?.editableItemIds.has(line.itemId) ?? false
                      const saved = putAway?.savedSlots[line.itemId]
                      const slotLabel = saved?.label ?? null
                      return (
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
                          {putAway ? (
                            <TableCell className="whitespace-normal">
                              {putAway && editable ? (
                                <ShipmentPutAwayCell
                                  label={line.sku}
                                  saved={saved}
                                  options={putAway.slotOptions}
                                  isLoading={putAway.isLoadingSlots}
                                  isPending={putAway.isPending}
                                  onSearchChange={putAway.onSlotSearchChange}
                                  onOpenMap={() => setMapItemId(line.itemId)}
                                  onSave={(slot) => putAway.onSave(line.itemId, slot)}
                                />
                              ) : (
                                (slotLabel ?? '—')
                              )}
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
      {putAway ? (
        <TransferSlotMapDialog
          open={mapItemId !== null}
          onOpenChange={(next) => !next && setMapItemId(null)}
          title="Chọn vị trí cất hàng trên sơ đồ kho nhập"
          description="Chọn ô sẽ cất hàng khi nhận. Nhân viên vẫn quét mã ô khi cất hàng."
          warehouseId={putAway.warehouseId}
          onConfirm={({ slotId, label }) => {
            if (mapItemId) putAway.onSave(mapItemId, { value: slotId, label })
          }}
        />
      ) : null}
    </>
  )
}
