import Link from 'next/link'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { APP_ROUTES } from '@/routes/app-routes'

export function ForecastPlanningCard() {
  return (
    <Card className="group border-primary/30 bg-primary/5 relative h-full overflow-hidden py-0 shadow-none transition-[box-shadow,transform] duration-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none">
      <Link
        href={APP_ROUTES.reportForecast}
        aria-labelledby="forecast-planning-title"
        className="focus-visible:ring-primary absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />
      <CardContent className="pointer-events-none flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="bg-primary/10 text-primary rounded-xl p-3">
            <TrendingUp className="size-5" aria-hidden="true" />
          </span>
          <ArrowUpRight className="text-primary size-5" aria-hidden="true" />
        </div>
        <div>
          <h3 id="forecast-planning-title" className="text-base font-semibold">
            Dự báo & bổ sung hàng
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Phân tích lịch sử xuất, tính nhu cầu và kiểm tra nháp nhập kho trước khi gửi duyệt.
          </p>
        </div>
        <p className="text-primary mt-auto text-xs font-medium">Mở kế hoạch tồn kho →</p>
      </CardContent>
    </Card>
  )
}
