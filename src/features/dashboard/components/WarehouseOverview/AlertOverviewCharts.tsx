import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import type { UrlObject } from 'url'
import { AlertTriangle, ArrowUpRight, CalendarClock, PackageMinus } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { InventoryAnomalySummary } from '@/features/inventory-anomaly/types/inventory-anomaly.types'
import type {
  StockExpiryDistribution,
  StockThresholdAlerts,
} from '../../schemas/stock-alert.schema'
import { toExpiryBuckets } from '../../utils/expiry-buckets'

export interface AlertChartState<T> {
  readonly data?: T
  readonly isLoading: boolean
  readonly errorMessage?: string
  readonly onRetry: () => void
}

interface AlertOverviewChartsProps {
  /** Trang đầu của cảnh báo dưới tối thiểu, đã xếp thiếu nhiều nhất trước. */
  readonly belowMinimum: AlertChartState<StockThresholdAlerts>
  readonly expiry: AlertChartState<StockExpiryDistribution>
  /** Không truyền khi người dùng không có quyền xem cảnh báo bất thường. */
  readonly anomalies?: AlertChartState<InventoryAnomalySummary>
  readonly expiringDays: number
  readonly anomaliesHref?: Route | UrlObject
}

const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})
const formatDay = (date: string) => dayFormatter.format(new Date(`${date}T00:00:00Z`))
const formatNumber = (value: number) => value.toLocaleString('vi-VN')

export function AlertOverviewCharts({
  belowMinimum,
  expiry,
  anomalies,
  expiringDays,
  anomaliesHref,
}: AlertOverviewChartsProps) {
  const openAnomalies = anomalies?.data
    ? anomalies.data.openHigh + anomalies.data.openMedium
    : undefined
  return (
    <section aria-label="Tóm tắt cảnh báo" className="flex shrink-0 flex-col gap-3">
      <div
        className={cn(
          'grid gap-3',
          anomalies
            ? 'grid-cols-1 @min-[40rem]:grid-cols-3'
            : 'grid-cols-1 @min-[40rem]:grid-cols-2'
        )}
      >
        <AlertCountTile
          icon={<PackageMinus aria-hidden="true" />}
          tone="destructive"
          label="Khả dụng dưới mức tối thiểu"
          value={belowMinimum.data?.totalCount}
          unit="sản phẩm"
          isLoading={belowMinimum.isLoading}
          hasError={Boolean(belowMinimum.errorMessage)}
        />
        <AlertCountTile
          icon={<CalendarClock aria-hidden="true" />}
          tone="warning"
          label={`Hàng gần hết hạn (${expiringDays} ngày)`}
          value={expiry.data?.totalCount}
          unit="lô"
          isLoading={expiry.isLoading}
          hasError={Boolean(expiry.errorMessage)}
        />
        {anomalies ? (
          <AlertCountTile
            icon={<AlertTriangle aria-hidden="true" />}
            tone="tertiary"
            label="Cảnh báo bất thường chưa xem"
            value={openAnomalies}
            unit={anomalies.data ? `(${formatNumber(anomalies.data.openHigh)} mức cao)` : ''}
            isLoading={anomalies.isLoading}
            hasError={Boolean(anomalies.errorMessage)}
            href={anomaliesHref}
          />
        ) : null}
      </div>
      <div
        className={cn(
          'grid gap-3',
          anomalies
            ? 'grid-cols-1 @min-[48rem]:grid-cols-2 @min-[72rem]:grid-cols-3'
            : 'grid-cols-1 @min-[48rem]:grid-cols-2'
        )}
      >
        <ChartCard
          title="Dưới mức tối thiểu"
          description="Khả dụng so với mức tối thiểu, các sản phẩm thiếu nhiều nhất"
          state={belowMinimum}
          isEmpty={!belowMinimum.data?.items.length}
          emptyText="Không có sản phẩm dưới mức tối thiểu."
        >
          {belowMinimum.data ? <BelowMinimumChart data={belowMinimum.data} /> : null}
        </ChartCard>
        <ChartCard
          title="Hàng gần hết hạn"
          description={`Số lô theo số ngày còn lại, trong ${expiringDays} ngày tới`}
          state={expiry}
          isEmpty={!expiry.data?.totalCount}
          emptyText="Không có lô nào sắp hết hạn."
        >
          {expiry.data ? <ExpiryDistributionChart data={expiry.data} /> : null}
        </ChartCard>
        {anomalies ? (
          <ChartCard
            title="Cảnh báo bất thường"
            description="Số cảnh báo mới mỗi ngày, 14 ngày gần nhất"
            state={anomalies}
            isEmpty={false}
            emptyText=""
          >
            {anomalies.data ? <AnomalyTrendChart data={anomalies.data} /> : null}
          </ChartCard>
        ) : null}
      </div>
    </section>
  )
}

const toneClasses = {
  destructive: 'border-l-destructive text-destructive',
  warning: 'border-l-warning text-warning',
  tertiary: 'border-l-tertiary text-tertiary',
} as const

function AlertCountTile({
  icon,
  tone,
  label,
  value,
  unit,
  isLoading,
  hasError,
  href,
}: {
  readonly icon: ReactNode
  readonly tone: keyof typeof toneClasses
  readonly label: string
  readonly value?: number
  readonly unit: string
  readonly isLoading: boolean
  readonly hasError: boolean
  readonly href?: Route | UrlObject
}) {
  return (
    <Card className={cn('gap-0 rounded-l-none border-l-4 py-0 ring-0', toneClasses[tone])}>
      <CardContent className="flex items-center gap-3 p-3">
        <span className="[&_svg]:size-5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-xs" title={label}>
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-16 rounded-sm motion-reduce:animate-none" />
          ) : (
            <p className="text-foreground text-2xl font-semibold tabular-nums">
              {hasError || value === undefined ? '—' : formatNumber(value)}{' '}
              <span className="text-muted-foreground text-xs font-normal">
                {hasError ? 'Chưa tải được' : unit}
              </span>
            </p>
          )}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
          >
            Xem
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ChartCard<T>({
  title,
  description,
  state,
  isEmpty,
  emptyText,
  children,
}: {
  readonly title: string
  readonly description: string
  readonly state: AlertChartState<T>
  readonly isEmpty: boolean
  readonly emptyText: string
  readonly children: ReactNode
}) {
  return (
    <Card
      className="min-w-0 gap-0 rounded-xl border py-0 ring-0"
      role="region"
      aria-label={title}
      aria-busy={state.isLoading || undefined}
    >
      <CardHeader className="gap-0.5 border-b p-3">
        <CardTitle>
          <h2 className="text-sm font-semibold">{title}</h2>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex h-52 min-w-0 flex-col p-3">
        {state.isLoading ? (
          <Skeleton className="h-full w-full rounded-md motion-reduce:animate-none" />
        ) : state.errorMessage && !state.data ? (
          <Alert variant="destructive">
            <AlertDescription>
              {state.errorMessage}
              <Button type="button" variant="outline" size="sm" onClick={state.onRetry}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : isEmpty ? (
          <p className="text-muted-foreground m-auto text-sm">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function BelowMinimumChart({ data }: { readonly data: StockThresholdAlerts }) {
  const rows = data.items.map((item) => ({
    name: item.productName,
    sku: item.sku,
    unit: item.unit,
    available: item.availableQuantity,
    threshold: item.thresholdQuantity,
    // Thang phần trăm để so được các hàng khác ĐVT với nhau.
    percent:
      item.thresholdQuantity > 0
        ? Math.max(0, Math.round((item.availableQuantity / item.thresholdQuantity) * 100))
        : 0,
  }))
  return (
    <div
      className="min-h-0 flex-1"
      role="img"
      aria-label={`Khả dụng so với mức tối thiểu: ${rows
        .map((row) => `${row.name} ${row.percent}%`)
        .join(', ')}.`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height: 200 }}
      >
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(value) => `${value}%`}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            fontSize={11}
            tickFormatter={(value: string) =>
              value.length > 12 ? `${value.slice(0, 11)}…` : value
            }
          />
          <Tooltip
            formatter={(_value, _name, entry) => {
              const row = entry.payload as (typeof rows)[number]
              return [
                `${formatNumber(row.available)} / ${formatNumber(row.threshold)} ${row.unit} (${row.percent}%)`,
                'Khả dụng / tối thiểu',
              ]
            }}
            labelFormatter={(label, payload) =>
              `${label} · ${(payload[0]?.payload as (typeof rows)[number] | undefined)?.sku ?? ''}`
            }
          />
          <Bar dataKey="percent" radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={`${row.sku}-${row.name}`}
                fill={row.percent < 50 ? 'var(--color-destructive)' : 'var(--color-warning)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ExpiryDistributionChart({ data }: { readonly data: StockExpiryDistribution }) {
  const buckets = toExpiryBuckets(data.days, data.expiringDays)
  return (
    <div
      className="min-h-0 flex-1"
      role="img"
      aria-label={`Số lô sắp hết hạn: ${buckets
        .map((bucket) => `${bucket.label} ${bucket.lotCount} lô`)
        .join(', ')}.`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height: 200 }}
      >
        <BarChart data={buckets} margin={{ right: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={11} interval={0} />
          <YAxis allowDecimals={false} fontSize={11} width={28} />
          <Tooltip formatter={(value) => [`${formatNumber(Number(value))} lô`, 'Sắp hết hạn']} />
          <Bar dataKey="lotCount" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {buckets.map((bucket) => (
              <Cell
                key={bucket.label}
                fill={bucket.to <= 3 ? 'var(--color-destructive)' : 'var(--color-warning)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AnomalyTrendChart({ data }: { readonly data: InventoryAnomalySummary }) {
  const total = data.newLast14Days.reduce((sum, day) => sum + day.high + day.medium, 0)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        className="min-h-0 flex-1"
        role="img"
        aria-label={`${total} cảnh báo bất thường mới trong 14 ngày gần nhất.`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 320, height: 200 }}
        >
          <BarChart data={data.newLast14Days} margin={{ right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDay} fontSize={11} minTickGap={8} />
            <YAxis allowDecimals={false} fontSize={11} width={28} />
            <Tooltip labelFormatter={(value) => `Ngày ${formatDay(String(value))}`} />
            <Bar
              dataKey="high"
              name="Mức cao"
              stackId="severity"
              fill="var(--color-destructive)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="medium"
              name="Trung bình"
              stackId="severity"
              fill="var(--color-warning)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-muted-foreground flex shrink-0 flex-wrap gap-x-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="bg-destructive size-2.5 rounded-xs" aria-hidden="true" />
          Mức cao
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-warning size-2.5 rounded-xs" aria-hidden="true" />
          Trung bình
        </span>
        <span className="ml-auto tabular-nums">Tổng 14 ngày: {formatNumber(total)}</span>
      </p>
    </div>
  )
}
