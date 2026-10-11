'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Eye, Plus, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountStatus, CycleCountSummary } from '../types/cycle-count.types'
import {
  CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER,
  CYCLE_COUNT_STATUSES,
} from '../types/cycle-count.types'
import {
  CYCLE_COUNT_STATUS_LABELS,
  formatCycleCountDate,
  formatCycleCountDay,
  getOverdueDays,
  hasCountResults,
} from '../utils/cycle-count-format'
import { CycleCountStatusBadge } from './CycleCountStatusBadge'

const ALL_STATUSES = 'all'

type ListFilter = '' | CycleCountStatus | typeof CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER

// Phiếu đã hoàn tất chỉ thực sự xong khi mọi dòng lệch đã có điều chỉnh tồn được duyệt.
function getAdjustmentState(item: CycleCountSummary) {
  const variance = item.varianceItemCount ?? 0
  if (item.status !== CYCLE_COUNT_STATUSES.completed || variance === 0) return null
  if (item.adjustedItemCount < variance)
    return {
      label: `Cần tạo điều chỉnh (${item.adjustedItemCount}/${variance})`,
      variant: 'destructive',
    } as const
  if (item.approvedAdjustmentItemCount < variance)
    return {
      label: `Chờ duyệt điều chỉnh (${item.approvedAdjustmentItemCount}/${variance})`,
      variant: 'outline',
    } as const
  return { label: 'Đã xử lý', variant: 'secondary' } as const
}

interface Props {
  readonly items: readonly CycleCountSummary[]
  readonly totalCount: number
  readonly statusCounts: Readonly<Record<string, number>>
  readonly needsAdjustmentCount: number
  readonly page: number
  readonly pageSize: number
  readonly warehouseId: string
  readonly status: ListFilter
  readonly searchTerm: string
  readonly warehouses: readonly { value: string; label: string }[]
  readonly canCreate: boolean
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onStatusChange: (value: ListFilter) => void
  readonly onSearchTermChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onPrefetchDetail: (cycleCountId: string) => void
}

export function CycleCountDirectory(props: Props) {
  const router = useRouter()
  const allCount = Object.values(props.statusCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b pb-2">
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center">
          <ClipboardCheck className="size-4" aria-hidden="true" />
        </span>
        <h1 className="text-base font-semibold">Kiểm kê định kỳ</h1>
        {props.canCreate ? (
          <Button asChild className="ml-auto">
            <Link href={APP_ROUTES.cycleCountCreate}>
              <Plus aria-hidden="true" />
              Tạo phiếu kiểm kê
            </Link>
          </Button>
        ) : null}
      </header>
      {props.needsAdjustmentCount > 0 && props.status !== CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER ? (
        <Alert variant="destructive" className="flex shrink-0 items-center gap-3">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription className="flex-1">
            {props.needsAdjustmentCount} phiếu đã hoàn tất còn dòng lệch chưa tạo điều chỉnh tồn.
            Tồn kho chỉ thay đổi sau khi phiếu điều chỉnh được duyệt.
          </AlertDescription>
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onStatusChange(CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER)}
          >
            Xem phiếu cần xử lý
          </Button>
        </Alert>
      ) : null}
      <OperationalListPanel aria-label="Danh sách kiểm kê">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3">
          <Tabs
            value={props.status || ALL_STATUSES}
            onValueChange={(value) => props.onStatusChange(parseCycleCountStatus(value))}
            className="overflow-x-auto"
          >
            <TabsList>
              <TabsTrigger value={ALL_STATUSES}>
                Tất cả
                <Badge variant="secondary">{allCount}</Badge>
              </TabsTrigger>
              {Object.values(CYCLE_COUNT_STATUSES).map((value) => (
                <TabsTrigger key={value} value={value}>
                  {CYCLE_COUNT_STATUS_LABELS[value]}
                  <Badge variant="secondary">{props.statusCounts[value] ?? 0}</Badge>
                </TabsTrigger>
              ))}
              <TabsTrigger value={CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER}>
                Cần xử lý lệch
                <Badge variant={props.needsAdjustmentCount > 0 ? 'destructive' : 'secondary'}>
                  {props.needsAdjustmentCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-full sm:w-72">
              <FieldLabel htmlFor="cycleCountSearch">Tìm phiếu</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="cycleCountSearch"
                  placeholder="Số phiếu hoặc mục đích"
                  value={props.searchTerm}
                  onChange={(event) => props.onSearchTermChange(event.target.value)}
                />
              </InputGroup>
            </Field>
            <Field className="w-full sm:w-64">
              <FieldLabel htmlFor="cycleCountWarehouse">Kho</FieldLabel>
              <NativeSelect
                id="cycleCountWarehouse"
                value={props.warehouseId}
                onChange={(event) => props.onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
                {props.warehouses.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Button
              variant="outline"
              size="icon"
              aria-label="Làm mới"
              disabled={props.isFetching}
              onClick={props.onRetry}
            >
              <RefreshCw
                className={props.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
              />
            </Button>
          </div>
        </div>
        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải danh sách kiểm kê" onRetry={props.onRetry} />
        ) : props.items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có phiếu kiểm kê"
            description="Tạo phiếu mới hoặc thay đổi bộ lọc để xem dữ liệu."
          />
        ) : (
          <Table
            aria-label="Danh sách phiếu kiểm kê"
            aria-busy={props.isFetching}
            // Giữ bảng cũ, mờ nhẹ khi đang tải trang/bộ lọc mới thay vì nháy skeleton.
            className={cn(
              'min-w-[1300px] transition-opacity duration-200 motion-reduce:transition-none',
              props.isFetching && 'opacity-60'
            )}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="bg-card sticky top-0 z-10">Số phiếu / Kho</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Mục đích</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Phụ trách</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Lịch kiểm kê</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Kiểm kê đến ngày</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Tiến độ</TableHead>
                <TableHead className="bg-card sticky top-0 z-10 text-right">Lệch</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Trạng thái</TableHead>
                <TableHead className="bg-card sticky top-0 z-10">Xử lý chênh lệch</TableHead>
                <TableHead className="bg-card sticky top-0 z-10 w-14">
                  <span className="sr-only">Xem chi tiết</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.items.map((item) => {
                const overdueDays = getOverdueDays(item.dueDate, item.status)
                const adjustmentState = getAdjustmentState(item)
                const detailHref = APP_ROUTES.cycleCountDetail(item.id)
                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/60 cursor-pointer"
                    tabIndex={0}
                    onMouseEnter={() => props.onPrefetchDetail(item.id)}
                    onFocus={() => props.onPrefetchDetail(item.id)}
                    onClick={() => router.push(detailHref)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') router.push(detailHref)
                    }}
                  >
                    <TableCell>
                      <Link
                        href={detailHref}
                        className="font-mono text-xs font-medium underline-offset-2 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.code}
                      </Link>
                      <p className="font-medium">{item.warehouseName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.zoneName || 'Toàn kho'} ·{' '}
                        {item.isBlindCount ? 'Kiểm kê mù (ẩn tồn)' : 'Kiểm kê thường (hiện tồn)'}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="line-clamp-2">{item.purpose || '—'}</p>
                    </TableCell>
                    <TableCell>{item.assignedToName || 'Chưa phân công'}</TableCell>
                    <TableCell>{formatCycleCountDate(item.scheduledDate)}</TableCell>
                    <TableCell>
                      {item.dueDate ? formatCycleCountDay(item.dueDate) : '—'}
                      {overdueDays > 0 ? (
                        <Badge variant="destructive" className="ml-2">
                          Quá hạn {overdueDays} ngày
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-32">
                      {hasCountResults(item.status) ? (
                        <>
                          <p className="font-mono tabular-nums">
                            {item.countedItemCount}/{item.itemCount}
                          </p>
                          <div className="bg-muted mt-1 h-1.5">
                            <div
                              className="bg-primary h-full transition-[width] duration-300 motion-reduce:transition-none"
                              style={{
                                width: `${item.itemCount ? (item.countedItemCount / item.itemCount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.varianceItemCount === null || !hasCountResults(item.status) ? (
                        <span className="text-muted-foreground">—</span>
                      ) : item.varianceItemCount > 0 ? (
                        <Badge variant="destructive">{item.varianceItemCount}</Badge>
                      ) : (
                        <span className="font-mono tabular-nums">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CycleCountStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {adjustmentState ? (
                        <Badge variant={adjustmentState.variant}>{adjustmentState.label}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          aria-label="Xem chi tiết"
                          href={detailHref}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Eye />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isFetching}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      </OperationalListPanel>
    </div>
  )
}

function parseCycleCountStatus(value: string): ListFilter {
  if (value === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER) return value
  return Object.values(CYCLE_COUNT_STATUSES).find((status) => status === value) ?? ''
}
