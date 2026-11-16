import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import type { OperationalAlert } from '../../types/ai-alerts.types'
import { formatAlertTime } from '../../utils/ai-alerts-format'
import { AlertStatusBadge, SeverityIndicator } from './AlertBadges'

interface AlertListProps {
  readonly items: OperationalAlert[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly hasActiveFilters: boolean
  readonly warehouseName: (warehouseId: string | null) => string
  readonly onOpen: (alertId: string) => void
  readonly onRetry: () => void
}

export function AlertList(props: AlertListProps) {
  if (props.isLoading) return <OperationalLoadingState />
  if (props.isError) {
    return <OperationalErrorState title="Không thể tải cảnh báo" onRetry={props.onRetry} />
  }
  if (props.items.length === 0) {
    return (
      <OperationalEmptyState
        title={props.hasActiveFilters ? 'Không có cảnh báo phù hợp bộ lọc' : 'Chưa có cảnh báo nào'}
        description="Khi một quy tắc theo dõi phát hiện vấn đề, cảnh báo sẽ xuất hiện tại đây."
      />
    )
  }
  return (
    <>
      <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
        {props.items.map((alert) => (
          <Item
            key={alert.id}
            {...rowActivationProps(() => props.onOpen(alert.id), 'border-b last:border-b-0')}
            role="button"
            aria-label={`Xem cảnh báo: ${alert.title}`}
          >
            <ItemContent>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityIndicator severity={alert.severity} />
                <AlertStatusBadge status={alert.status} />
              </div>
              <ItemTitle className="font-semibold">{alert.title}</ItemTitle>
              <ItemDescription>{alert.summary}</ItemDescription>
              <ItemDescription>
                {props.warehouseName(alert.warehouseId)} · {formatAlertTime(alert.lastDetectedAt)}
              </ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Mức độ</TableHead>
              <TableHead>Cảnh báo</TableHead>
              <TableHead className="w-44">Kho</TableHead>
              <TableHead className="w-40">Phát hiện gần nhất</TableHead>
              <TableHead className="w-36">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.items.map((alert) => (
              <ClickableTableRow key={alert.id} onActivate={() => props.onOpen(alert.id)}>
                <TableCell>
                  <SeverityIndicator severity={alert.severity} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <button
                    type="button"
                    className="focus-visible:ring-ring/50 text-left text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => props.onOpen(alert.id)}
                  >
                    {alert.title}
                  </button>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {alert.summary}
                  </p>
                </TableCell>
                <TableCell className="text-xs">{props.warehouseName(alert.warehouseId)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatAlertTime(alert.lastDetectedAt)}
                </TableCell>
                <TableCell>
                  <AlertStatusBadge status={alert.status} />
                </TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
