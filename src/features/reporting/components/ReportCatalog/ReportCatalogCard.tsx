import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowUpFromLine,
  Boxes,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  History,
  PackageSearch,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APP_ROUTES } from '@/routes/app-routes'
import type { ReportDefinition } from '../../schemas/warehouse-report.schema'

const icons: Record<string, LucideIcon> = {
  'inventory-balance': ChartNoAxesCombined,
  'inventory-snapshot': Boxes,
  'stock-card': History,
  'inbound-progress': ArrowDownToLine,
  'outbound-progress': ArrowUpFromLine,
  'transfer-reconciliation': ArrowLeftRight,
  'count-adjustment': ClipboardCheck,
  'task-progress': ClipboardList,
  replenishment: PackageSearch,
  'slow-moving': History,
}
interface ReportCatalogCardProps {
  readonly report: ReportDefinition
  readonly isFavorite: boolean
  readonly onToggleFavorite: (type: string) => void
}
export function ReportCatalogCard({
  report,
  isFavorite,
  onToggleFavorite,
}: ReportCatalogCardProps) {
  const Icon = icons[report.type] ?? ChartNoAxesCombined
  return (
    <Card className="group border-border/70 hover:border-primary/40 relative h-full overflow-hidden py-0 shadow-none transition-[box-shadow,border-color,transform] duration-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none">
      <Link
        href={{
          pathname: `${APP_ROUTES.reports}/${report.type}`,
          query: report.requiresProduct ? {} : { autoRun: '1' },
        }}
        aria-labelledby={`report-${report.type}`}
        className="focus-visible:ring-primary absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />
      <CardContent className="pointer-events-none flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div className="bg-primary/10 text-primary group-hover:bg-primary/15 rounded-xl p-3 transition-colors duration-200">
            <Icon className="size-5" aria-hidden />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="pointer-events-auto relative z-10 size-11 rounded-full"
            aria-label={`${isFavorite ? 'Bỏ' : 'Thêm'} yêu thích: ${report.name}`}
            aria-pressed={isFavorite}
            onClick={() => onToggleFavorite(report.type)}
          >
            <Star
              className={`size-4 transition-[transform,color] duration-200 motion-safe:group-active:scale-110 ${isFavorite ? 'text-primary fill-current' : 'text-muted-foreground'}`}
              aria-hidden
            />
          </Button>
        </div>
        <div className="flex-1">
          <h3 id={`report-${report.type}`} className="text-base leading-snug font-semibold">
            {report.name}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{report.description}</p>
        </div>
        <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
          <span>
            {report.requiresProduct
              ? 'Chọn mặt hàng'
              : report.usesPeriod
                ? 'Theo kỳ'
                : 'Tồn hiện tại'}
          </span>
          <span className="text-primary flex items-center gap-1 font-medium">
            Xem báo cáo{' '}
            <ArrowUpRight
              className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
              aria-hidden
            />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
