import type { AlertMetrics } from '../../types/ai-alerts.types'
import { formatHours } from '../../utils/ai-alerts-format'

// Chỉ hiện khi có số liệu: dải thống kê là phụ, lỗi/đang tải thì ẩn thay vì chiếm chỗ.
export function AlertMetricsStrip({ metrics }: { readonly metrics: AlertMetrics | undefined }) {
  if (!metrics) return null
  const stats = [
    { label: 'Phát sinh', value: String(metrics.generated) },
    { label: 'Đã ghi nhận', value: String(metrics.acknowledged) },
    { label: 'Đã đóng', value: String(metrics.resolved) },
    { label: 'Đóng trung vị sau', value: formatHours(metrics.medianHoursToResolve) },
  ]
  return (
    <section aria-label="Thống kê cảnh báo 30 ngày qua" className="shrink-0">
      <dl className="bg-card grid grid-cols-2 rounded-lg border @2xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-0 flex-col px-3 py-1.5 odd:border-r @max-2xl:nth-[-n+2]:border-b @2xl:border-r @2xl:last:border-r-0"
          >
            <dt className="text-muted-foreground truncate text-xs">{stat.label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-1 text-xs">30 ngày qua</p>
    </section>
  )
}
