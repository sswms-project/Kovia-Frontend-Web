import { MoreHorizontal } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PickLineCard } from './PickLineCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferPickSheetLine } from '../../types/transfer.types'
import { formatTransferLocation } from '../../utils/transfer-location'
import { cn } from '@/lib/utils'
import { SHIPMENT_LINE_STATUS_LABELS } from '../../utils/transfer-format'

interface Props {
  readonly lines: readonly TransferPickSheetLine[]
  readonly selectedId?: string
  readonly canAct: boolean
  readonly busy: boolean
  readonly onPick: (line: TransferPickSheetLine) => void
  readonly onSwitch: (line: TransferPickSheetLine) => void
  readonly onEscalate: (line: TransferPickSheetLine) => void
  readonly onReturn: (line: TransferPickSheetLine) => void
}

export function TransferPickLinesTable({
  lines,
  selectedId,
  canAct,
  busy,
  onPick,
  onSwitch,
  onEscalate,
  onReturn,
}: Props) {
  const mobileLines =
    canAct && selectedId ? lines.filter((line) => line.lineId !== selectedId) : lines
  return (
    <OperationalListPanel
      aria-label="Hàng cần lấy"
      className={cn('lg:order-first', mobileLines.length === 0 && 'max-lg:hidden')}
    >
      <div
        data-slot="operational-list-body"
        data-scrollbar="slim"
        className="grid gap-3 p-3 lg:hidden"
      >
        {mobileLines.map((line) => (
          <PickLineCard
            key={line.lineId}
            line={line}
            canAct={canAct && !busy}
            onPick={onPick}
            onSwitch={onSwitch}
            onEscalate={onEscalate}
            onReturn={onReturn}
          />
        ))}
      </div>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hàng hóa / Nơi lấy</TableHead>
              <TableHead className="text-right">Đã lấy / Cần lấy</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const blocked =
                busy || !canAct || line.remainingQuantity <= 0 || line.status === 'PendingManager'
              return (
                <TableRow
                  key={line.lineId}
                  data-state={selectedId === line.lineId ? 'selected' : undefined}
                >
                  <TableCell className="min-w-48 whitespace-normal">
                    <p className="font-medium">{line.productName}</p>
                    <p className="text-muted-foreground font-mono text-xs">{line.sku}</p>
                    <ul className="mt-1 grid gap-1 text-xs">
                      {line.suggestions.map((suggestion) => (
                        <li key={suggestion.inventoryStockId}>
                          {formatTransferLocation(suggestion)}
                          {suggestion.lotNumber ? ` · Lô ${suggestion.lotNumber}` : ''} ·{' '}
                          {formatQuantity(suggestion.suggestedQuantity)} {line.baseUnitName}
                        </li>
                      ))}
                    </ul>
                    <Badge variant="outline" className="mt-1">
                      {SHIPMENT_LINE_STATUS_LABELS[line.status]}
                    </Badge>
                    {line.pendingReturnQuantity > 0 ? (
                      <p className="text-destructive text-xs">
                        Cần trả {formatQuantity(line.pendingReturnQuantity)} {line.baseUnitName}
                      </p>
                    ) : null}
                    {line.picks.length > 0 || line.exceptions.length > 0 ? (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Chi tiết lấy / trả / báo cáo
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <PickLineCard
                            line={line}
                            canAct={false}
                            onPick={onPick}
                            onSwitch={onSwitch}
                            onEscalate={onEscalate}
                            onReturn={onReturn}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(
                      line.pickedQuantity +
                        line.picks.reduce((sum, pick) => sum + pick.dispatchedQuantity, 0)
                    )}{' '}
                    / {formatQuantity(line.plannedQuantity)}
                    <p className="text-muted-foreground text-xs">{line.baseUnitName}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {canAct ? (
                        <>
                          <Button
                            size="sm"
                            variant={selectedId === line.lineId ? 'default' : 'outline'}
                            disabled={blocked}
                            onClick={() => onPick(line)}
                          >
                            {selectedId === line.lineId ? 'Đang quét' : 'Lấy hàng'}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="outline"
                                disabled={busy}
                                aria-label={`Xử lý khác ${line.sku}`}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4}>
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  disabled={blocked}
                                  onSelect={() => onSwitch(line)}
                                >
                                  Đổi vị trí/lô
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={blocked}
                                  onSelect={() => onEscalate(line)}
                                >
                                  Báo thiếu / Báo quản lý
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={
                                    !line.picks.some(
                                      (pick) =>
                                        pick.pickedQuantity -
                                          pick.returnedQuantity -
                                          pick.dispatchedQuantity >
                                        0
                                    )
                                  }
                                  onSelect={() => onReturn(line)}
                                >
                                  Trả hàng về vị trí
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </OperationalListPanel>
  )
}
