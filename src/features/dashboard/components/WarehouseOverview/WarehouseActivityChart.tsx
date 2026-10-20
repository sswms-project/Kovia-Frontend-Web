import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { WarehouseActivity } from '../../schemas/warehouse-overview.schema'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface WarehouseActivityChartProps {
  readonly data?: WarehouseActivity
  readonly periodFilter?: ReactNode
  readonly isLoading?: boolean
  readonly errorMessage?: string
  readonly onRefresh?: () => void
}

const activityDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

export function WarehouseActivityChart({
  data,
  periodFilter,
  isLoading,
  errorMessage,
  onRefresh,
}: WarehouseActivityChartProps) {
  const received = data?.activity.reduce((sum, day) => sum + day.completedReceipts, 0) ?? 0
  const issued = data?.activity.reduce((sum, day) => sum + day.dispatchedIssues, 0) ?? 0
  return (
    <Card
      className="min-h-0 min-w-0 flex-1 gap-0 rounded-xl border py-0 ring-0"
      role="region"
      aria-label="Nhập – xuất kho trong kỳ"
      aria-busy={isLoading || undefined}
    >
      <CardHeader className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>
            <h2>Nhập – xuất kho trong kỳ</h2>
          </CardTitle>
          {data ? (
            <CardDescription>
              {activityDateFormatter.format(new Date(`${data.activityDateFrom}T00:00:00Z`))} –{' '}
              {activityDateFormatter.format(new Date(`${data.activityDateTo}T00:00:00Z`))}
            </CardDescription>
          ) : isLoading ? (
            <Skeleton
              aria-hidden="true"
              className="h-4 w-40 rounded-sm motion-reduce:animate-none"
            />
          ) : null}
        </div>
        {periodFilter ? <div className="min-w-0 flex-1 basis-112">{periodFilter}</div> : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3" role="status">
            <p className="sr-only">Đang tải biểu đồ…</p>
            <div
              className="grid shrink-0 grid-cols-2 gap-3 border-b pb-3 text-xs"
              aria-hidden="true"
            >
              {['Phiếu nhập hoàn tất', 'Phiếu xuất hoàn tất'].map((label) => (
                <div key={label}>
                  <p className="text-muted-foreground">{label}</p>
                  <Skeleton className="mt-1 h-7 w-10 rounded-sm motion-reduce:animate-none" />
                </div>
              ))}
            </div>
            <div className="flex min-h-0 flex-1 gap-2" aria-hidden="true">
              <div className="flex shrink-0 flex-col justify-between pb-6">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-3 w-5 rounded-sm motion-reduce:animate-none" />
                ))}
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div className="flex min-h-0 flex-1 items-end gap-4 border-b border-l px-3 pt-6">
                  {['h-2/5', 'h-3/4', 'h-1/3', 'h-3/5', 'h-1/2', 'h-4/5'].map((height) => (
                    <div key={height} className="flex h-full min-w-0 flex-1 items-end gap-1">
                      <Skeleton
                        className={cn(
                          'min-w-0 flex-1 rounded-t-sm motion-reduce:animate-none',
                          height
                        )}
                      />
                      <Skeleton className="h-1/4 min-w-0 flex-1 rounded-t-sm motion-reduce:animate-none" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton
                      key={index}
                      className="h-3 w-8 rounded-sm motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-center gap-4" aria-hidden="true">
              <Skeleton className="h-3 w-28 rounded-sm motion-reduce:animate-none" />
              <Skeleton className="h-3 w-28 rounded-sm motion-reduce:animate-none" />
            </div>
          </div>
        ) : errorMessage || !data ? (
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage ?? 'Chưa tải được biểu đồ.'}
              {onRefresh ? (
                <Button type="button" variant="outline" onClick={onRefresh}>
                  Thử lại biểu đồ
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <dl className="grid shrink-0 grid-cols-2 gap-3 border-b pb-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Phiếu nhập hoàn tất</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {received.toLocaleString('vi-VN')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phiếu xuất hoàn tất</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {issued.toLocaleString('vi-VN')}
                </dd>
              </div>
            </dl>
            <div
              className="min-h-0 min-w-0 flex-1"
              role="img"
              aria-label={`Hoạt động trong kỳ: ${received} phiếu nhập hoàn tất và ${issued} phiếu xuất hoàn tất.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.activity} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      data.activityGranularity === 'month'
                        ? String(value).slice(0, 7)
                        : String(value).slice(5)
                    }
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} fontSize={11} width={28} />
                  <Tooltip
                    labelFormatter={(value) =>
                      `${data.activityGranularity === 'month' ? 'Tháng' : data.activityGranularity === 'week' ? 'Tuần từ' : 'Ngày'} ${data.activityGranularity === 'month' ? String(value).slice(0, 7) : activityDateFormatter.format(new Date(`${value}T00:00:00Z`))}`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="completedReceipts"
                    name="Phiếu nhập hoàn tất"
                    fill="var(--color-primary)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="dispatchedIssues"
                    name="Phiếu xuất hoàn tất"
                    fill="var(--color-chart-2)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="text-muted-foreground shrink-0 p-3 text-xs">
        <p title="Đếm chứng từ có mốc hoàn tất được ghi nhận theo giờ Việt Nam; không cộng số lượng khác SKU. Phiếu nhận thiếu mốc cất cuối không được suy từ ngày sửa.">
          Theo ngày hoàn tất (giờ Việt Nam). Kỳ này không thay đổi các chỉ số tồn hiện tại.
        </p>
      </CardFooter>
    </Card>
  )
}
