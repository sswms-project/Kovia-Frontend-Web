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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { WarehouseOverview } from '../../schemas/warehouse-overview.schema'

interface WarehouseActivityChartProps {
  readonly data: WarehouseOverview
  readonly activityDays: number
  readonly onActivityDaysChange: (value: number) => void
}

const activityDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

export function WarehouseActivityChart({
  data,
  activityDays,
  onActivityDaysChange,
}: WarehouseActivityChartProps) {
  const received = data.activity.reduce((sum, day) => sum + day.completedReceipts, 0)
  const issued = data.activity.reduce((sum, day) => sum + day.dispatchedIssues, 0)
  return (
    <Card
      className="min-h-0 min-w-0 flex-1 gap-0 rounded-xl border py-0 ring-0"
      role="region"
      aria-label="Phiếu hoàn tất trong kỳ"
    >
      <CardHeader className="shrink-0 border-b p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            <h2>Phiếu hoàn tất trong kỳ</h2>
          </CardTitle>
          <label className="flex items-center gap-2 text-xs">
            Kỳ hoạt động
            <NativeSelect
              value={String(activityDays)}
              onChange={(event) => onActivityDaysChange(Number(event.target.value))}
            >
              {[7, 30, 90].map((days) => (
                <NativeSelectOption key={days} value={String(days)}>
                  {days} ngày gần nhất
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>
        <CardDescription>
          {activityDateFormatter.format(new Date(`${data.activityDateFrom}T00:00:00Z`))} –{' '}
          {activityDateFormatter.format(new Date(`${data.activityDateTo}T00:00:00Z`))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <dl className="grid shrink-0 grid-cols-2 gap-3 border-b pb-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Phiếu nhận cất xong</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {received.toLocaleString('vi-VN')}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phiếu xác nhận xuất</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {issued.toLocaleString('vi-VN')}
            </dd>
          </div>
        </dl>
        <div
          className="min-h-0 min-w-0 flex-1"
          role="img"
          aria-label={`Hoạt động trong kỳ: ${received} phiếu nhận cất xong và ${issued} phiếu xuất.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.activity} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => String(value).slice(5)}
                fontSize={11}
              />
              <YAxis allowDecimals={false} fontSize={11} width={28} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="completedReceipts"
                name="Phiếu nhận cất xong"
                fill="var(--color-primary)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="dispatchedIssues"
                name="Phiếu xác nhận xuất"
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="text-muted-foreground shrink-0 p-3 text-xs">
        <p title="Đếm chứng từ có mốc hoàn tất được ghi nhận theo giờ Việt Nam; không cộng số lượng khác SKU. Phiếu nhận thiếu mốc cất cuối không được suy từ ngày sửa.">
          Theo ngày hoàn tất (giờ Việt Nam). Kỳ này không thay đổi các chỉ số tồn hiện tại.
        </p>
      </CardFooter>
    </Card>
  )
}
