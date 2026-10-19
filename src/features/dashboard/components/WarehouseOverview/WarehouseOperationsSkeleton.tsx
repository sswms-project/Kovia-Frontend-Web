import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { WarehouseActivityChart } from './WarehouseActivityChart'

interface WarehouseOperationsSkeletonProps {
  readonly compact: boolean
}

export function WarehouseOperationsSkeleton({ compact }: WarehouseOperationsSkeletonProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {!compact ? <WarehouseMetricsSkeleton /> : null}
      <div
        className={cn(
          'min-h-0 min-w-0 flex-1',
          compact ? 'flex' : 'grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3'
        )}
      >
        {!compact ? (
          <WarehouseActivityChart
            isLoading
            periodFilter={
              <div className="flex h-13 items-end justify-end gap-3" aria-hidden="true">
                <Skeleton className="h-8 w-32 rounded-sm motion-reduce:animate-none" />
                <Skeleton className="h-8 w-40 rounded-sm motion-reduce:animate-none" />
                <Skeleton className="h-8 w-16 rounded-sm motion-reduce:animate-none" />
              </div>
            }
          />
        ) : null}
        <WarehouseDetailsSkeleton compact={compact} showForecast={false} />
      </div>
    </div>
  )
}

export function WarehouseMetricsSkeleton() {
  return (
    <div
      className="grid shrink-0 grid-cols-4 gap-3"
      aria-hidden="true"
      data-slot="warehouse-metrics-skeleton"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} size="sm" className="min-w-0 rounded-xl border ring-0">
          <CardHeader className="min-h-8">
            <Skeleton className="h-5 w-3/4 rounded-sm motion-reduce:animate-none" />
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <Skeleton className="h-8 w-12 rounded-sm motion-reduce:animate-none" />
            <Skeleton className="h-4 w-4/5 rounded-sm motion-reduce:animate-none" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface WarehouseDetailsSkeletonProps {
  readonly compact: boolean
  readonly showForecast: boolean
}

export function WarehouseDetailsSkeleton({ compact, showForecast }: WarehouseDetailsSkeletonProps) {
  return (
    <OperationalListPanel aria-busy="true" role="status" aria-label="Đang tải chỉ số vận hành">
      <span className="sr-only">Đang tải chỉ số vận hành…</span>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b p-3"
        aria-hidden="true"
      >
        <h2 className="text-sm font-semibold">Chi tiết vận hành</h2>
        {showForecast ? (
          <Skeleton className="h-8 w-32 rounded-sm motion-reduce:animate-none" />
        ) : null}
      </div>
      <Table aria-hidden="true">
        <TableHeader>
          <TableRow>
            <TableHead className="bg-card">Chỉ số</TableHead>
            <TableHead className="bg-card text-right">Giá trị</TableHead>
          </TableRow>
        </TableHeader>
        {(compact ? [4, 5, 3, 4] : [5, 3, 4]).map((rows, groupIndex) => (
          <TableBody key={groupIndex}>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell colSpan={2} className="py-2">
                <Skeleton className="h-4 w-28 rounded-sm motion-reduce:animate-none" />
              </TableCell>
            </TableRow>
            {Array.from({ length: rows }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-3/5 rounded-sm motion-reduce:animate-none" />
                </TableCell>
                <TableCell>
                  <Skeleton className="ml-auto h-4 w-8 rounded-sm motion-reduce:animate-none" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>
      <div className="shrink-0 border-t p-3" aria-hidden="true">
        <Skeleton className="h-4 w-4/5 rounded-sm motion-reduce:animate-none" />
      </div>
    </OperationalListPanel>
  )
}
