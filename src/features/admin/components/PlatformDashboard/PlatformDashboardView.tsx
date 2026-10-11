'use client'

import {
  Activity,
  Building2,
  CircleCheck,
  CircleHelp,
  CircleX,
  CreditCard,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import type { PlatformDashboardResponse } from '../../types/admin.types'
import {
  formatAdminCurrency,
  formatAdminDateTime,
  formatTenantStatusText,
} from '../../utils/platform-admin-format'

interface PlatformDashboardViewProps {
  readonly data?: PlatformDashboardResponse
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isFetching: boolean
  readonly onRetry: () => void
}

const revenueChartConfig = {
  revenue: { label: 'Doanh thu', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatCompactVnd(value: number) {
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
  if (value >= 1_000_000_000) return `${trim(value / 1_000_000_000)} tỷ`
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}tr`
  if (value >= 1_000) return `${trim(value / 1_000)}k`
  return String(value)
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  )
}

function HealthIcon({ status }: { readonly status: string }) {
  if (status === 'Healthy')
    return <CircleCheck className="text-primary size-4" aria-hidden="true" />
  if (status === 'Unhealthy')
    return <CircleX className="text-destructive size-4" aria-hidden="true" />
  return <CircleHelp className="text-chart-4 size-4" aria-hidden="true" />
}

export function PlatformDashboardView({
  data,
  isLoading,
  isError,
  isFetching,
  onRetry,
}: PlatformDashboardViewProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  if (isLoading) {
    return (
      <div className="space-y-4" aria-label="Đang tải dashboard nền tảng">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-72 lg:col-span-8" />
          <Skeleton className="h-72 lg:col-span-4" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <CircleX aria-hidden="true" />
        <AlertTitle>Không thể tải dashboard nền tảng</AlertTitle>
        <AlertDescription>
          Dữ liệu vận hành hiện chưa sẵn sàng.
          <Button variant="outline" size="sm" className="ml-3" onClick={onRetry}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const metrics = [
    { label: 'Tổng doanh nghiệp', value: data.tenantSummary.total, icon: Building2 },
    { label: 'Doanh nghiệp hoạt động', value: data.tenantSummary.active, icon: Activity },
    { label: 'Đăng ký hiệu lực', value: data.subscriptionSummary.active, icon: CreditCard },
  ]
  if (data.userSummary) {
    metrics.splice(2, 0, {
      label: 'Người dùng hoạt động',
      value: data.userSummary.active,
      icon: Users,
    })
  }
  const maxPlanCount = Math.max(...data.planDistribution.map((item) => item.tenantCount), 1)
  const recentTenants = data.recentTenants
  const revenueTrend = data.revenueTrend ?? []
  const revenueChartData = revenueTrend.map((point) => ({
    label: `${String(point.month).padStart(2, '0')}/${String(point.year).slice(-2)}`,
    revenue: point.revenue,
    paymentCount: point.paymentCount,
  }))
  const totalTrendRevenue = revenueTrend.reduce((sum, point) => sum + point.revenue, 0)

  return (
    <div className="w-full min-w-0 space-y-5">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-xs font-medium">Quản trị nền tảng</p>
          <h2 className="text-xl font-semibold">Dashboard hệ thống</h2>
        </div>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={onRetry}>
          <RefreshCw
            className={cn('size-4', isFetching && 'animate-spin motion-reduce:animate-none')}
            aria-hidden="true"
          />
          Làm mới
        </Button>
      </header>

      <section
        className={cn(
          'grid gap-3 sm:grid-cols-2',
          metrics.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
        )}
        aria-label="Chỉ số chính"
      >
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="bg-card flex min-h-24 items-center gap-4 border p-4">
            <span className="bg-primary/8 text-primary flex size-10 items-center justify-center">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="bg-card border p-4 lg:col-span-8" aria-labelledby="tenant-status-title">
          <h2 id="tenant-status-title" className="text-sm font-semibold">
            Phân bổ trạng thái doanh nghiệp
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Có {data.tenantSummary.newLast30Days} doanh nghiệp mới trong 30 ngày.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Hoạt động', data.tenantSummary.active, 'bg-primary'],
              ['Tạm ngưng', data.tenantSummary.suspended, 'bg-destructive'],
              ['Chờ kích hoạt', data.tenantSummary.pending, 'bg-chart-4'],
              ['Không hoạt động', data.tenantSummary.inactive, 'bg-muted-foreground'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="border p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <i className={cn('size-2', color)} aria-hidden="true" />
                    {label}
                  </span>
                  <strong className="tabular-nums">{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="bg-card border p-4 lg:col-span-4"
          aria-labelledby="service-health-title"
        >
          <h2 id="service-health-title" className="text-sm font-semibold">
            Sức khỏe dịch vụ
          </h2>
          <div className="mt-3 divide-y">
            {data.serviceHealth.map((service) => (
              <div key={service.service} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <HealthIcon status={service.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{service.service}</p>
                    <Badge variant="outline">{service.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatAdminDateTime(service.checkedAt)}
                  </p>
                  {service.message ? (
                    <p className="text-destructive mt-1 text-xs">{service.message}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section
          className="bg-card border p-4 lg:col-span-7"
          aria-labelledby="plan-distribution-title"
        >
          <h2 id="plan-distribution-title" className="text-sm font-semibold">
            Phân bổ theo gói
          </h2>
          {data.planDistribution.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Chưa có đăng ký hiệu lực.
            </p>
          ) : (
            <div className="mt-4 max-h-28 space-y-3 overflow-y-auto pr-2">
              {data.planDistribution.map((item) => (
                <div key={item.planId}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span>{item.planName}</span>
                    <span>{item.tenantCount} doanh nghiệp</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden">
                    <div
                      className="bg-chart-1 h-full"
                      style={{ width: `${(item.tenantCount / maxPlanCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section
          className="bg-card border p-4 lg:col-span-5"
          aria-labelledby="subscription-status-title"
        >
          <h2 id="subscription-status-title" className="text-sm font-semibold">
            Trạng thái đăng ký
          </h2>
          <dl className="mt-4 grid grid-cols-3 divide-x border">
            <div className="p-3 text-center">
              <dt className="text-muted-foreground text-xs">Hiệu lực</dt>
              <dd className="mt-1 text-lg font-semibold">{data.subscriptionSummary.active}</dd>
            </div>
            <div className="p-3 text-center">
              <dt className="text-muted-foreground text-xs">Hết hạn</dt>
              <dd className="mt-1 text-lg font-semibold">{data.subscriptionSummary.expired}</dd>
            </div>
            <div className="p-3 text-center">
              <dt className="text-muted-foreground text-xs">Đã hủy</dt>
              <dd className="mt-1 text-lg font-semibold">{data.subscriptionSummary.cancelled}</dd>
            </div>
          </dl>
        </section>
      </div>

      {data.revenueTrend ? (
        <section className="bg-card border p-4" aria-labelledby="revenue-trend-title">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="revenue-trend-title" className="text-sm font-semibold">
                Doanh thu 12 tháng gần nhất
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Tổng cộng {formatAdminCurrency(totalTrendRevenue)}
              </p>
            </div>
          </div>
          {revenueChartData.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Chưa có doanh thu hoàn tất.
            </p>
          ) : (
            <ChartContainer
              config={revenueChartConfig}
              className="mt-4 aspect-auto h-72 w-full"
              role="img"
              aria-label={`Biểu đồ cột doanh thu ${revenueChartData.length} tháng gần nhất`}
            >
              <BarChart data={revenueChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={formatCompactVnd}
                />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.4 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => (
                        <div className="grid w-full gap-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Doanh thu</span>
                            <span className="font-medium tabular-nums">
                              {formatAdminCurrency(Number(value))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Giao dịch</span>
                            <span className="font-medium tabular-nums">
                              {item.payload.paymentCount}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  maxBarSize={36}
                  isAnimationActive={!prefersReducedMotion}
                />
              </BarChart>
            </ChartContainer>
          )}
          {revenueChartData.length > 0 ? (
            <table className="sr-only">
              <caption>Doanh thu theo tháng</caption>
              <thead>
                <tr>
                  <th scope="col">Tháng</th>
                  <th scope="col">Doanh thu</th>
                  <th scope="col">Số giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {revenueChartData.map((point) => (
                  <tr key={point.label}>
                    <th scope="row">{point.label}</th>
                    <td>{formatAdminCurrency(point.revenue)}</td>
                    <td>{point.paymentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {recentTenants ? (
        <section className="bg-card border p-4" aria-labelledby="recent-tenants-title">
          <h2 id="recent-tenants-title" className="text-sm font-semibold">
            Doanh nghiệp đăng ký gần đây
          </h2>
          {recentTenants.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Chưa có doanh nghiệp nào.
            </p>
          ) : (
            <ul className="mt-3 divide-y">
              {recentTenants.map((tenant) => (
                <li
                  key={tenant.tenantId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tenant.tenantName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {tenant.email} · {formatAdminDateTime(tenant.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{formatTenantStatusText(tenant.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
