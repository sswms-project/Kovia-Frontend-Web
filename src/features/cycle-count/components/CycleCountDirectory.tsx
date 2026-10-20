'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Eye, Flame, Plus, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountListFilter, CycleCountSummary } from '../types/cycle-count.types'
import {
  CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER,
  CYCLE_COUNT_STATUS_GROUPS,
} from '../types/cycle-count.types'
import {
  formatCycleCountDate,
  formatCycleCountDay,
  getAdjustmentState,
  getOverdueDays,
  hasCountResults,
  isUrgentOpen,
} from '../utils/cycle-count-format'
import { CycleCountCards } from './CycleCountCards'
import { CycleCountStatsTiles } from './CycleCountStatsTiles'
import { CycleCountStatusBadge } from './CycleCountStatusBadge'
import { OptionSelect } from './OptionSelect'
import {
  CycleCountDeadlineHint,
  CycleCountPriorityBadge,
  URGENT_FIRST_CELL_CLASS,
  URGENT_ROW_CLASS,
} from './CycleCountUrgency'

const ALL_STATUSES = 'all'

const SORT_OPTIONS = [
  { value: 'priority', label: 'Ưu tiên xử lý' },
  { value: 'newest', label: 'Mới tạo nhất' },
] as const

interface Props {
  readonly items: readonly CycleCountSummary[]
  readonly totalCount: number
  readonly statusCounts: Readonly<Record<string, number>>
  readonly needsAdjustmentCount: number
  readonly urgentOpenCount: number
  readonly urgentOnly: boolean
  readonly page: number
  readonly pageSize: number
  readonly warehouseId: string
  readonly sortBy: string
  readonly status: CycleCountListFilter
  readonly searchTerm: string
  readonly warehouses: readonly { value: string; label: string }[]
  readonly canCreate: boolean
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onSortChange: (value: string) => void
  readonly onStatusChange: (value: CycleCountListFilter) => void
  readonly onUrgentOnlyChange: (value: boolean) => void
  readonly onSearchTermChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
  readonly onPrefetchDetail: (cycleCountId: string) => void
}

export function CycleCountDirectory(props: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
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
      <CycleCountStatsTiles
        statusCounts={props.statusCounts}
        needsAdjustmentCount={props.needsAdjustmentCount}
        isLoading={props.isLoading}
        isError={props.isError}
      />
      <OperationalListPanel aria-label="Danh sách kiểm kê">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3">
          <Tabs
            // Chip "Cần xử lý lệch" là tập con của phiếu đã hoàn tất nên tab đó sáng khi chip bật.
            value={
              props.status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
                ? 'Closed'
                : props.status || ALL_STATUSES
            }
            onValueChange={(value) => props.onStatusChange(parseCycleCountStatus(value))}
            className="min-w-0 shrink-0 overflow-x-auto overflow-y-hidden p-1"
          >
            <TabsList>
              <TabsTrigger value={ALL_STATUSES}>
                Tất cả
                <Badge variant="secondary">{allCount}</Badge>
              </TabsTrigger>
              {CYCLE_COUNT_STATUS_GROUPS.map((group) => (
                <TabsTrigger key={group.value} value={group.value}>
                  {group.label}
                  <Badge variant="secondary">
                    {group.statuses.reduce(
                      (sum, value) => sum + (props.statusCounts[value] ?? 0),
                      0
                    )}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Field className="col-span-2 sm:w-72">
              <FieldLabel htmlFor="cycleCountSearch" className="max-sm:sr-only">
                Tìm phiếu
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="cycleCountSearch"
                  className="max-sm:h-11 max-sm:text-base"
                  placeholder="Số phiếu hoặc mục đích"
                  value={props.searchTerm}
                  onChange={(event) => props.onSearchTermChange(event.target.value)}
                />
              </InputGroup>
            </Field>
            <Field className="sm:w-64">
              <FieldLabel htmlFor="cycleCountWarehouse" className="max-sm:sr-only">
                Kho
              </FieldLabel>
              <OptionSelect
                id="cycleCountWarehouse"
                className="max-sm:h-11"
                value={props.warehouseId}
                options={props.warehouses}
                emptyLabel="Tất cả kho"
                onValueChange={props.onWarehouseChange}
              />
            </Field>
            <Field className="sm:w-48">
              <FieldLabel htmlFor="cycleCountSort" className="max-sm:sr-only">
                Sắp xếp
              </FieldLabel>
              <OptionSelect
                id="cycleCountSort"
                className="max-sm:h-11"
                value={props.sortBy}
                options={SORT_OPTIONS}
                onValueChange={props.onSortChange}
              />
            </Field>
            {props.urgentOpenCount > 0 || props.urgentOnly ? (
              <Button
                className="max-sm:h-11"
                variant={props.urgentOnly ? 'default' : 'outline'}
                aria-pressed={props.urgentOnly}
                onClick={() => props.onUrgentOnlyChange(!props.urgentOnly)}
              >
                <Flame aria-hidden="true" />
                Khẩn
                <Badge variant="destructive">{props.urgentOpenCount}</Badge>
              </Button>
            ) : null}
            {props.needsAdjustmentCount > 0 ||
            props.status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER ? (
              <Button
                className="max-sm:h-11"
                variant={
                  props.status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER ? 'default' : 'outline'
                }
                aria-pressed={props.status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER}
                onClick={() =>
                  props.onStatusChange(
                    props.status === CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
                      ? ''
                      : CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER
                  )
                }
              >
                <TriangleAlert aria-hidden="true" />
                Cần xử lý lệch
                <Badge variant="destructive">{props.needsAdjustmentCount}</Badge>
              </Button>
            ) : null}
            <div className="flex shrink-0 items-center gap-2">
              {props.exportAction}
              <Button
                variant="outline"
                size="icon"
                className="max-sm:h-11 max-sm:w-full"
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
        ) : isMobile ? (
          <CycleCountCards
            items={props.items}
            isFetching={props.isFetching}
            onPrefetchDetail={props.onPrefetchDetail}
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
              {props.items.map((item, index) => {
                const overdueDays = getOverdueDays(item.dueDate, item.status)
                const adjustmentState = getAdjustmentState(item)
                const detailHref = APP_ROUTES.cycleCountDetail(item.id)
                const isUrgent = isUrgentOpen(item.priority, item.status)
                return (
                  <TableRow
                    key={item.id}
                    style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                    // Dòng trượt nhẹ vào khi đổi tab/trang, so le theo thứ tự; tắt khi người dùng giảm chuyển động.
                    className={cn(
                      'hover:bg-muted/60 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 fill-mode-backwards animation-duration-300 cursor-pointer',
                      isUrgent && URGENT_ROW_CLASS
                    )}
                    tabIndex={0}
                    onMouseEnter={() => props.onPrefetchDetail(item.id)}
                    onFocus={() => props.onPrefetchDetail(item.id)}
                    onClick={() => router.push(detailHref)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') router.push(detailHref)
                    }}
                  >
                    <TableCell className={cn(isUrgent && URGENT_FIRST_CELL_CLASS)}>
                      <div className="flex items-center gap-2">
                        <Link
                          href={detailHref}
                          className="font-mono text-xs font-medium underline-offset-2 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {item.code}
                        </Link>
                        <CycleCountPriorityBadge priority={item.priority} status={item.status} />
                      </div>
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
                      <CycleCountDeadlineHint
                        className="block"
                        priority={item.priority}
                        status={item.status}
                        dueAt={item.dueAt}
                      />
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

function parseCycleCountStatus(value: string): CycleCountListFilter {
  return CYCLE_COUNT_STATUS_GROUPS.find((group) => group.value === value)?.value ?? ''
}
