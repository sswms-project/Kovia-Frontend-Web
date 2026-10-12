import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  Download,
  Search,
  SearchX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { FORECAST_RISK_LABELS } from '../../utils/forecast-overview'
import type {
  ForecastOverviewRow,
  ForecastRisk,
  ForecastRiskFilter,
} from '../../utils/forecast-overview'
import { formatInventoryDateOnly, formatInventoryQuantity } from '../../utils/inventory-format'

interface ForecastOverviewViewProps {
  // The rows of the current page, already filtered; totalCount is the filtered total.
  readonly rows: readonly ForecastOverviewRow[]
  readonly totalCount: number
  // Counts over every product of the run, so the chips stay put while a filter is applied.
  readonly riskCounts: Readonly<Record<ForecastRisk, number>>
  readonly search: string
  readonly risk: ForecastRiskFilter
  readonly page: number
  readonly pageSize: number
  readonly onSearchChange: (search: string) => void
  readonly onRiskChange: (risk: ForecastRiskFilter) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onSelectProduct: (productId: string) => void
  readonly onExport: () => void
}

interface RiskStyle {
  readonly icon: LucideIcon
  readonly badge: string
  readonly bar: string
  readonly date: string
}

// Icon and text always accompany the color so risk never depends on color alone.
const RISK_STYLES: Record<ForecastRisk, RiskStyle> = {
  stockout: {
    icon: AlertTriangle,
    badge: 'bg-destructive/10 text-destructive',
    bar: 'bg-destructive',
    date: 'text-destructive font-medium',
  },
  watch: {
    icon: Clock,
    badge: 'bg-warning-container text-on-warning-container',
    bar: 'bg-warning',
    date: 'text-warning font-medium',
  },
  ok: {
    icon: CheckCircle2,
    badge: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
    date: 'text-muted-foreground',
  },
  unknown: {
    icon: CircleDashed,
    badge: 'bg-muted text-muted-foreground',
    bar: 'bg-muted-foreground',
    date: 'text-muted-foreground',
  },
}

const RISK_FILTERS: readonly ForecastRisk[] = ['stockout', 'watch', 'ok', 'unknown']

const COLUMNS = [
  { label: 'Mặt hàng', numeric: false },
  { label: 'Mức rủi ro', numeric: false },
  { label: 'Tồn khả dụng', numeric: true },
  { label: 'Nhu cầu cả kỳ', numeric: true },
  { label: 'Trung bình/ngày', numeric: true },
  { label: 'Số ngày đủ hàng', numeric: true },
  { label: 'Dự kiến hết hàng', numeric: false },
  { label: 'Mô hình', numeric: false },
  { label: 'WAPE (%)', numeric: true },
] as const

// Rows beyond this share one delay, so a 50-row page never waits long for its last row.
const MAX_STAGGERED_ROWS = 10
const STAGGER_MS = 25

function quantity(value: number | null): string {
  return value === null ? '—' : formatInventoryQuantity(value)
}

function RiskBadge({ risk }: { readonly risk: ForecastRisk }) {
  const { icon: Icon, badge } = RISK_STYLES[risk]
  return (
    <Badge variant="outline" className={cn('gap-1 border-transparent', badge)}>
      <Icon className="size-3" aria-hidden="true" />
      {FORECAST_RISK_LABELS[risk]}
    </Badge>
  )
}

function CoverBar({ row }: { readonly row: ForecastOverviewRow }) {
  if (row.daysOfCover === null || row.periodDays === null) return null
  const covered = Math.min(row.daysOfCover, row.periodDays)
  return (
    <div
      role="meter"
      aria-label="Độ phủ tồn kho"
      aria-valuemin={0}
      aria-valuemax={row.periodDays}
      aria-valuenow={covered}
      className="bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
    >
      {/* Transform and opacity only: the bar slides in, its width is never animated. */}
      <div
        className={cn(
          'animate-in fade-in-0 slide-in-from-left-full animation-duration-500 h-full rounded-full motion-reduce:animate-none',
          RISK_STYLES[row.risk].bar
        )}
        style={{ width: `${(covered / row.periodDays) * 100}%` }}
      />
    </div>
  )
}

function OverviewRow({
  row,
  index,
  onSelectProduct,
}: {
  readonly row: ForecastOverviewRow
  readonly index: number
  readonly onSelectProduct: (productId: string) => void
}) {
  return (
    <TableRow
      className="animate-in fade-in-0 animation-duration-300 motion-reduce:animate-none"
      style={{
        animationDelay: `${Math.min(index, MAX_STAGGERED_ROWS) * STAGGER_MS}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <TableCell className="min-w-56">
        <Button
          variant="ghost"
          title="Xem nhu cầu & sai số"
          className="group -mx-2 h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
          onClick={() => onSelectProduct(row.productId)}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.productName}</span>
            <span className="text-muted-foreground block text-xs font-normal">
              <span className="font-mono">{row.sku}</span> · {row.unitName || 'ĐVT cơ sở'}
            </span>
          </span>
          <ChevronRight
            className="text-muted-foreground size-4 shrink-0 -translate-x-1 opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Button>
      </TableCell>
      <TableCell>
        <RiskBadge risk={row.risk} />
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {quantity(row.availableQuantity)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{quantity(row.totalDemand)}</TableCell>
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {quantity(row.averageDailyDemand)}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <CoverBar row={row} />
          <span className="min-w-14 text-right tabular-nums">
            {row.daysOfCover === null ? '—' : `${row.daysOfCover} ngày`}
          </span>
        </div>
      </TableCell>
      <TableCell className={cn('whitespace-nowrap', RISK_STYLES[row.risk].date)}>
        {row.stockoutDate ? formatInventoryDateOnly(row.stockoutDate) : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">{row.modelLabel}</TableCell>
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {quantity(row.wape)}
      </TableCell>
    </TableRow>
  )
}

export function ForecastOverviewView({
  rows,
  totalCount,
  riskCounts,
  search,
  risk,
  page,
  pageSize,
  onSearchChange,
  onRiskChange,
  onPageChange,
  onPageSizeChange,
  onSelectProduct,
  onExport,
}: ForecastOverviewViewProps) {
  return (
    <OperationalListPanel aria-label="Tổng quan dự báo theo mặt hàng">
      <div className="flex shrink-0 flex-col gap-2 border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Tìm mặt hàng"
              placeholder="Tìm theo SKU hoặc tên mặt hàng"
              className="pl-9"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            aria-label="Lọc theo mức rủi ro"
            className="flex-wrap"
            value={risk === 'all' ? '' : risk}
            onValueChange={(value) =>
              // Pressing the active chip again clears the filter.
              onRiskChange(RISK_FILTERS.find((option) => option === value) ?? 'all')
            }
          >
            {RISK_FILTERS.map((option) => {
              const { icon: Icon } = RISK_STYLES[option]
              return (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary gap-1.5 rounded-md"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {FORECAST_RISK_LABELS[option]}{' '}
                  <span className="tabular-nums">{riskCounts[option]}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          <Button variant="outline" size="sm" disabled={totalCount === 0} onClick={onExport}>
            <Download className="size-4" aria-hidden="true" />
            Xuất CSV
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Số ngày đủ hàng so nhu cầu dự báo với tồn khả dụng lúc tính phiên, chưa cộng hàng đang
          nhập. Sắp hết: thiếu hàng trong 7 ngày đầu; Cần theo dõi: thiếu hàng trong kỳ dự báo.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                className={cn('bg-card', column.numeric && 'text-right')}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMNS.length} className="text-muted-foreground py-14">
                <div className="flex flex-col items-center gap-2 text-center">
                  <SearchX className="size-6" aria-hidden="true" />
                  <p>
                    {search || risk !== 'all'
                      ? 'Không có mặt hàng phù hợp với bộ lọc.'
                      : 'Kho chưa có chính sách tồn đang hoạt động, hoặc phiên cũ chưa lưu căn cứ.'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row, index) => (
            <OverviewRow
              key={row.productId}
              row={row}
              index={index}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </TableBody>
      </Table>
      <OperationalPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </OperationalListPanel>
  )
}
