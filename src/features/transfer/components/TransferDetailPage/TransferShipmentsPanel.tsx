import { ChevronDown, PackageCheck, PackageSearch, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import {
  getDestinationAssignmentKind,
  type ShipmentCapabilities,
} from '../../utils/transfer-capabilities'
import { SHIPMENT_LINE_STATUS_LABELS, TASK_EXECUTION_LABELS } from '../../utils/transfer-format'
import { ShipmentStatusBadge } from '../TransfersPage'
import { TransferShipmentActions } from './TransferShipmentActions'
import type { TransferNextStep, TransferNextStepAction } from '../../utils/transfer-next-steps'

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
  readonly mode?: 'pick' | 'receive' | 'putaway' | 'execution'
  readonly nextSteps?: readonly TransferNextStep[]
  readonly onNextAction?: (action: TransferNextStepAction) => void
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
  const hasStarted = status === 'InProgress' || status === 'Paused' || status === 'Completed'
  return (
    <p className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      {status ? (TASK_EXECUTION_LABELS[status] ?? status) : '—'} ·{' '}
      {assigneeId
        ? `${hasStarted ? 'Nhân viên phụ trách' : 'Người được giao'}: ${assigneeName?.trim() || 'Nhân viên'}`
        : status === 'Completed'
          ? 'Không có người được phân công'
          : 'Chưa phân công'}
    </p>
  )
}

function DestinationTaskSummary({ shipment }: { readonly shipment: TransferShipment }) {
  if (!shipment.receiveTaskId && !shipment.receiveTaskCode && !shipment.putAwayTaskId) return null
  const checking =
    shipment.status === 'InTransit' || shipment.status === 'Receiving' || !shipment.putAwayTaskId
  const status = checking ? shipment.receiveTaskStatus : shipment.putAwayTaskStatus
  return (
    <Collapsible>
      <CollapsibleTrigger className="group hover:text-primary focus-visible:ring-ring flex min-h-8 items-center gap-2 text-left text-xs focus-visible:ring-2 max-md:min-h-11 pointer-coarse:min-h-11">
        <span>
          <span className="font-medium">Kho nhập · Cất hàng</span> ·{' '}
          {checking ? 'Kiểm tra trước khi cất' : 'Cất vào vị trí'}:{' '}
          {status ? (TASK_EXECUTION_LABELS[status] ?? status) : 'Chờ bắt đầu'}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 animation-duration-200 mt-1 flex flex-col gap-1 border-l-2 pl-3 motion-reduce:animate-none">
        {taskSummary(
          'Kiểm tra hàng đến',
          Boolean(shipment.receiveTaskId || shipment.receiveTaskCode),
          shipment.receiveTaskStatus,
          shipment.receiveAssigneeId,
          shipment.receiveAssigneeName
        )}
        {taskSummary(
          'Cất hàng',
          Boolean(shipment.putAwayTaskId),
          shipment.putAwayTaskStatus ?? null,
          shipment.putAwayAssigneeId ?? null,
          shipment.putAwayAssigneeName
        )}
      </CollapsibleContent>
    </Collapsible>
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
  mode: workspaceMode = 'pick',
  nextSteps = [],
  onNextAction,
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
      {workspaceMode === 'receive' && onOpenPlan ? (
        <div className="border-b p-3">
          <Button type="button" variant="outline" onClick={onOpenPlan}>
            Kế hoạch cất hàng
          </Button>
        </div>
      ) : null}
      <ul className="divide-border flex flex-col divide-y">
        {shipments.map((shipment) => {
          const mode =
            workspaceMode === 'execution'
              ? shipment.status === 'Picking' ||
                shipment.status === 'ReadyToDispatch' ||
                shipment.status === 'Cancelled'
                ? 'pick'
                : shipment.status === 'AwaitingPutAway'
                  ? 'putaway'
                  : 'receive'
              : workspaceMode
          const allowed = capabilities[shipment.id]
          const destinationAssignmentKind = getDestinationAssignmentKind(shipment, allowed)
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
                {workspaceMode === 'execution' && onNextAction ? (
                  <div className="ml-auto">
                    <TransferShipmentActions
                      transferId={transferId}
                      shipment={shipment}
                      allowed={allowed}
                      steps={nextSteps}
                      onAction={onNextAction}
                      onAssign={onAssignTask}
                      onCancel={onCancelShipment}
                      onReopen={onReopenPicking}
                      onOpenPlan={onOpenPlan}
                      isStartingReceive={isStartingReceive}
                    />
                  </div>
                ) : null}
              </div>
              <Collapsible defaultOpen>
                {workspaceMode === 'execution' ? (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="m-2">
                      Hàng hóa đợt {shipment.shipmentNumber} · {shipment.lines.length} dòng
                      <ChevronDown aria-hidden="true" />
                    </Button>
                  </CollapsibleTrigger>
                ) : null}
                <CollapsibleContent>
                  <OperationalListPanel
                    aria-label={`Hàng hóa đợt ${shipment.shipmentNumber}`}
                    className="flex-none border-x-0"
                  >
                    <Table className={mode === 'pick' ? 'min-w-[860px]' : 'min-w-[960px]'}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã hàng</TableHead>
                          <TableHead>Tên hàng</TableHead>
                          <TableHead>ĐVT</TableHead>
                          <TableHead>ĐVQĐ</TableHead>
                          <TableHead className="text-right">Kế hoạch</TableHead>
                          <TableHead className="text-right">Đã lấy</TableHead>
                          <TableHead className="text-right">Đã xuất</TableHead>
                          {mode !== 'pick' ? (
                            <TableHead className="text-right">SL thực nhận</TableHead>
                          ) : null}
                          <TableHead>Tình trạng</TableHead>
                          {mode === 'receive' ? <TableHead>Kế hoạch cất hàng</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shipment.lines.map((line) => {
                          return (
                            <TableRow key={line.id}>
                              <TableCell className="font-mono">{line.sku}</TableCell>
                              <TableCell className="whitespace-normal">
                                {line.productName}
                              </TableCell>
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
                              {mode !== 'pick' ? (
                                <TableCell className="text-right tabular-nums">
                                  {formatQuantity(line.receivedPhysicalQuantity ?? 0)}
                                </TableCell>
                              ) : null}
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
                  </OperationalListPanel>
                </CollapsibleContent>
              </Collapsible>
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
                    'Kho xuất · Lấy hàng',
                    Boolean(shipment.pickTaskId || shipment.pickTaskCode),
                    shipment.pickTaskStatus,
                    shipment.pickAssigneeId,
                    shipment.pickAssigneeName
                  )}
                  <DestinationTaskSummary shipment={shipment} />
                </div>
                {workspaceMode !== 'execution' ? (
                  <div className="flex flex-wrap gap-2">
                    {mode !== 'pick' && destinationAssignmentKind ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAssignTask(shipment, destinationAssignmentKind)}
                      >
                        <UserPlus aria-hidden="true" />
                        {destinationAssignmentKind === 'receive'
                          ? 'Giao việc nhận và cất hàng'
                          : 'Giao việc cất hàng'}
                      </Button>
                    ) : null}
                    {mode === 'putaway' && allowed?.canViewPutAway ? (
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
                        {isStartingReceive ? 'Đang bắt đầu…' : 'Kiểm nhận hàng'}
                      </Button>
                    ) : null}
                    {mode === 'receive' &&
                    allowed?.canViewReceive &&
                    shipment.status !== 'InTransit' ? (
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
                ) : null}
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
