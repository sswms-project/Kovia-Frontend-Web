import { ArrowLeftRight, CircleCheck, MapPin, TriangleAlert, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferPickSheetLine } from '../../types/transfer.types'
import {
  PICK_REASON_LABELS,
  SHIPMENT_LINE_STATUS_LABELS,
  labelOf,
} from '../../utils/transfer-format'
import { groupPicks } from '../../utils/transfer-pick-groups'
import { formatTransferLocation } from '../../utils/transfer-location'

interface PickLineCardProps {
  readonly line: TransferPickSheetLine
  readonly canAct: boolean
  readonly onPick: (line: TransferPickSheetLine) => void
  readonly onSwitch: (line: TransferPickSheetLine) => void
  readonly onEscalate: (line: TransferPickSheetLine) => void
  readonly onReturn: (line: TransferPickSheetLine) => void
}

const CHIP_TONES = {
  primary: 'border-primary/40 bg-primary/10 text-primary',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  muted: 'bg-muted text-muted-foreground',
} as const

/** Số lượng nhãn + số in đậm: "Lấy 6", "Trả 5", "Xuất 3". */
function PickQuantityChip({
  label,
  value,
  tone,
}: {
  readonly label: string
  readonly value: number
  readonly tone: keyof typeof CHIP_TONES
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 border px-2 py-0.5 text-xs ${CHIP_TONES[tone]}`}
    >
      {label}
      <strong className="text-sm leading-none font-bold tabular-nums">
        {formatQuantity(value)}
      </strong>
    </span>
  )
}

export function PickLineCard({
  line,
  canAct,
  onPick,
  onSwitch,
  onEscalate,
  onReturn,
}: PickLineCardProps) {
  const isDone = line.remainingQuantity <= 0 && line.pendingReturnQuantity <= 0
  const isPendingManager = line.status === 'PendingManager'
  const pendingExceptions = line.exceptions.filter(
    (exception) => exception.status === 'PendingManager'
  )
  // Phần đã xuất không còn nằm trong "đã lấy chờ xuất" nhưng vẫn là hàng nhân viên đã lấy.
  const totalPicked =
    line.pickedQuantity + line.picks.reduce((sum, pick) => sum + pick.dispatchedQuantity, 0)
  const outstandingPicks = line.picks.filter(
    (pick) => pick.pickedQuantity - pick.returnedQuantity - pick.dispatchedQuantity > 0
  )

  return (
    <article className="bg-card border" aria-label={`Dòng hàng ${line.sku}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold" translate="no">
            {line.sku}
          </p>
          <p className="text-sm">{line.productName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={isDone ? 'default' : isPendingManager ? 'outline' : 'secondary'}>
            {isDone ? <CircleCheck aria-hidden="true" /> : null}
            {SHIPMENT_LINE_STATUS_LABELS[line.status]}
          </Badge>
          <p className="text-sm tabular-nums">
            Đã lấy <strong>{formatQuantity(totalPicked)}</strong> /{' '}
            {formatQuantity(line.plannedQuantity)} {line.baseUnitName}
          </p>
        </div>
      </header>

      {line.suggestions.length > 0 && !isPendingManager && canAct ? (
        <div className="border-b p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium">Lấy tại (theo FEFO)</p>
          <ul className="grid gap-1">
            {line.suggestions.map((suggestion) => (
              <li
                key={suggestion.inventoryStockId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-mono font-medium" translate="no">
                  {formatTransferLocation(suggestion)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {suggestion.lotNumber ? `Lô ${suggestion.lotNumber}` : 'Không theo lô'}
                  {suggestion.expiryDate
                    ? ` · HSD ${formatOperationalDate(suggestion.expiryDate)}`
                    : ''}
                </span>
                <span className="tabular-nums">
                  {formatQuantity(suggestion.suggestedQuantity)} {line.baseUnitName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendingExceptions.length > 0 ? (
        <div className="bg-muted flex items-start gap-2 border-b p-3 text-sm" role="status">
          <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Đã báo quản lý, đang chờ xử lý</p>
            {pendingExceptions.map((exception) => (
              <p key={exception.id} className="text-muted-foreground text-xs">
                {labelOf(PICK_REASON_LABELS, exception.reasonCode)}
                {exception.note ? ` · ${exception.note}` : ''}
              </p>
            ))}
            <p className="text-muted-foreground text-xs">Bạn có thể tiếp tục các dòng khác.</p>
          </div>
        </div>
      ) : null}

      {line.pendingReturnQuantity > 0 ? (
        <div className="border-b p-3 text-sm" role="status">
          <p className="text-warning font-medium">
            Đã lấy dư {formatQuantity(line.pendingReturnQuantity)} {line.baseUnitName}: cần trả về
            vị trí trước khi xuất đợt.
          </p>
        </div>
      ) : null}

      {line.picks.length > 0 ? (
        <ul className="divide-y border-b">
          {groupPicks(line.picks).map((group) => (
            <li
              key={group.key}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="font-mono font-medium" translate="no">
                  {formatTransferLocation(group.pick)}
                </span>
                {group.pick.lotNumber ? (
                  <span className="text-muted-foreground text-xs">Lô {group.pick.lotNumber}</span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {group.returned > 0 ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    đã lấy {formatQuantity(group.picked)}, trả {formatQuantity(group.returned)}
                  </span>
                ) : null}
                {group.held > 0 ? (
                  <PickQuantityChip label="Đang giữ" value={group.held} tone="primary" />
                ) : null}
                {group.dispatched > 0 ? (
                  <PickQuantityChip label="Đã xuất" value={group.dispatched} tone="muted" />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {canAct ? (
        <footer className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            type="button"
            className="h-11"
            disabled={line.remainingQuantity <= 0 || isPendingManager}
            onClick={() => onPick(line)}
          >
            Lấy hàng
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={line.remainingQuantity <= 0 || isPendingManager}
            onClick={() => onSwitch(line)}
          >
            <ArrowLeftRight aria-hidden="true" />
            Đổi vị trí/lô
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={line.remainingQuantity <= 0 || isPendingManager}
            onClick={() => onEscalate(line)}
          >
            <TriangleAlert aria-hidden="true" />
            Báo quản lý
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={outstandingPicks.length === 0}
            onClick={() => onReturn(line)}
          >
            <Undo2 aria-hidden="true" />
            Trả hàng về vị trí
          </Button>
        </footer>
      ) : null}
    </article>
  )
}
