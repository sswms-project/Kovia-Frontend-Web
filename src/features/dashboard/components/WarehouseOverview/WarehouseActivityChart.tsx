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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WarehouseOverview } from '../../schemas/warehouse-overview.schema'

export function WarehouseActivityChart({ data }: { readonly data: WarehouseOverview }) {
  const received = data.activity.reduce((sum, day) => sum + day.completedReceipts, 0)
  const issued = data.activity.reduce((sum, day) => sum + day.dispatchedIssues, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Phiếu hoàn tất trong kỳ · {data.activityDateFrom} → {data.activityDateTo}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          {received} phiếu nhận đã cất xong · {issued} phiếu đã xác nhận xuất. Tồn hiện tại bên trên
          không thay đổi theo kỳ này.
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="h-64 min-w-0"
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
        <p className="text-muted-foreground mt-2 text-xs">
          Đếm chứng từ có mốc hoàn tất được ghi nhận theo giờ Việt Nam; không cộng số lượng khác
          SKU. Phiếu nhận thiếu mốc cất cuối không được suy từ ngày sửa.
        </p>
      </CardContent>
    </Card>
  )
}
