import Link from 'next/link'
import { ArrowUpRight, FileChartColumn, Search, Star, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { ReportDefinition } from '../../schemas/warehouse-report.schema'

const reportSections = [
  {
    key: 'inventory',
    name: 'Tồn kho',
    description: 'Số lượng tồn, vị trí lưu trữ và lịch sử tăng giảm.',
    types: ['inventory-balance', 'inventory-snapshot', 'stock-card'],
  },
  {
    key: 'operations',
    name: 'Tiến độ vận hành',
    description: 'Theo dõi nhập kho, xuất kho và công việc được giao.',
    types: ['inbound-progress', 'outbound-progress', 'task-progress'],
  },
  {
    key: 'control',
    name: 'Đối soát & kiểm soát',
    description: 'Kiểm tra chênh lệch điều chuyển, kiểm kê và điều chỉnh.',
    types: ['transfer-reconciliation', 'count-adjustment'],
  },
  {
    key: 'planning',
    name: 'Phân tích & bổ sung',
    description: 'Hàng chậm luân chuyển, nhu cầu bổ sung và dự báo.',
    types: ['slow-moving', 'replenishment'],
  },
]
interface ReportCatalogViewProps {
  readonly canForecast: boolean
  readonly reports: readonly ReportDefinition[]
  readonly search: string
  readonly isPending: boolean
  readonly errorMessage?: string
  readonly onSearchChange: (value: string) => void
  readonly group: string
  readonly onGroupChange: (value: string) => void
  readonly favorites: readonly string[]
  readonly onToggleFavorite: (type: string) => void
}
export function ReportCatalogView({
  canForecast,
  reports,
  search,
  isPending,
  errorMessage,
  onSearchChange,
  group,
  onGroupChange,
  favorites,
  onToggleFavorite,
}: ReportCatalogViewProps) {
  const query = search.trim().toLocaleLowerCase('vi')
  const extraGroups = [
    ...new Set(
      reports
        .filter((report) => !reportSections.some((section) => section.types.includes(report.type)))
        .map((report) => report.group)
    ),
  ]
  const sections = [
    ...reportSections,
    ...extraGroups.map((name) => ({
      key: `extra:${name}`,
      name,
      description: 'Báo cáo khác trong phạm vi được cấp.',
      types: reports
        .filter(
          (report) =>
            report.group === name &&
            !reportSections.some((section) => section.types.includes(report.type))
        )
        .map((report) => report.type),
    })),
  ]
    .map((section) => ({
      ...section,
      reports: reports.filter((report) => section.types.includes(report.type)),
      hasForecast: section.key === 'planning' && canForecast,
    }))
    .filter((section) => section.reports.length > 0 || section.hasForecast)
  const visibleSections = sections
    .filter((section) => group === 'all' || group === 'favorites' || section.key === group)
    .map((section) => ({
      ...section,
      reports: section.reports.filter(
        (report) =>
          (group !== 'favorites' || favorites.includes(report.type)) &&
          `${report.name} ${report.description} ${section.name}`
            .toLocaleLowerCase('vi')
            .includes(query)
      ),
      hasForecast:
        section.hasForecast &&
        group !== 'favorites' &&
        'dự báo & bổ sung hàng phân tích lịch sử xuất nhu cầu kế hoạch tồn kho nháp nhập kho'.includes(
          query
        ),
    }))
    .filter((section) => section.reports.length > 0 || section.hasForecast)
  const navigation = [
    { key: 'all', name: 'Tất cả báo cáo', count: reports.length + Number(canForecast) },
    {
      key: 'favorites',
      name: 'Yêu thích',
      count: reports.filter((report) => favorites.includes(report.type)).length,
    },
    ...sections.map((section) => ({
      key: section.key,
      name: section.name,
      count: section.reports.length + Number(section.hasForecast),
    })),
  ]
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Báo cáo & phân tích</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chọn nhóm nghiệp vụ, sau đó bấm tên báo cáo để xem.
          </p>
        </div>
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Tìm báo cáo</span>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm báo cáo…"
            className="bg-card pl-10"
          />
        </label>
      </header>
      {errorMessage ? (
        <p
          role="alert"
          className="text-destructive bg-destructive/5 shrink-0 rounded-lg border p-3 text-sm"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <nav
          aria-label="Nhóm báo cáo"
          className="bg-card flex shrink-0 flex-wrap gap-1 rounded-xl border p-2 lg:w-56 lg:flex-col lg:flex-nowrap lg:self-start"
        >
          {navigation.map((item) => (
            <Button
              key={item.key}
              variant={group === item.key ? 'secondary' : 'ghost'}
              aria-pressed={group === item.key}
              onClick={() => onGroupChange(item.key)}
              className="justify-start gap-2 lg:w-full"
            >
              {item.key === 'favorites' ? <Star className="size-4" aria-hidden /> : null}
              <span className="flex-1 text-left">{item.name}</span>
              <span className="text-muted-foreground text-xs">{item.count}</span>
            </Button>
          ))}
        </nav>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-3">
          {isPending ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2, 3, 4].map((id) => (
                <Skeleton key={id} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : null}
          <div className="grid content-start items-start gap-4 xl:grid-cols-2">
            {visibleSections.map((section) => (
              <section key={section.key} aria-label={section.name}>
                <Card className="motion-safe:animate-in motion-safe:fade-in-0 animation-duration-200 gap-0 overflow-hidden py-0 shadow-none motion-reduce:animate-none">
                  <CardHeader className="bg-muted/40 gap-1 border-b px-4 py-3">
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <CardDescription className="text-xs">{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 py-0">
                    <ul className="divide-border divide-y">
                      {section.reports.map((report) => (
                        <li key={report.type} className="flex items-center gap-1 pr-2">
                          <Link
                            aria-label={report.name}
                            href={{
                              pathname: `${APP_ROUTES.reports}/${report.type}`,
                              query: report.requiresProduct ? {} : { autoRun: '1' },
                            }}
                            className="group hover:bg-muted focus-visible:ring-ring flex min-w-0 flex-1 items-start gap-3 px-4 py-3 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset motion-reduce:transition-none"
                          >
                            <FileChartColumn
                              className="text-primary mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="text-primary block text-sm font-medium group-hover:underline">
                                {report.name}
                              </span>
                              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                                {report.description}
                              </span>
                            </span>
                            <ArrowUpRight
                              className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-reduce:transition-none"
                              aria-hidden
                            />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${favorites.includes(report.type) ? 'Bỏ' : 'Thêm'} yêu thích: ${report.name}`}
                            aria-pressed={favorites.includes(report.type)}
                            onClick={() => onToggleFavorite(report.type)}
                          >
                            <Star
                              className={cn(
                                'size-4',
                                favorites.includes(report.type)
                                  ? 'text-primary fill-current'
                                  : 'text-muted-foreground'
                              )}
                              aria-hidden
                            />
                          </Button>
                        </li>
                      ))}
                      {section.hasForecast ? (
                        <li>
                          <Link
                            href={APP_ROUTES.reportForecast}
                            aria-label="Dự báo & bổ sung hàng"
                            className="group hover:bg-muted focus-visible:ring-ring flex items-start gap-3 px-4 py-3 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset motion-reduce:transition-none"
                          >
                            <TrendingUp
                              className="text-tertiary mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                            <span className="flex-1">
                              <span className="text-tertiary block text-sm font-medium group-hover:underline">
                                Dự báo & bổ sung hàng
                              </span>
                              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                                Phân tích lịch sử xuất và kiểm tra nháp nhập kho được gợi ý.
                              </span>
                            </span>
                            <ArrowUpRight
                              className="text-muted-foreground mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
          {!isPending && !errorMessage && visibleSections.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <FileChartColumn className="size-7" aria-hidden />
              <p className="text-foreground font-medium">
                {group === 'favorites' && !query
                  ? 'Chưa có báo cáo yêu thích'
                  : 'Không tìm thấy báo cáo'}
              </p>
              <p className="text-sm">
                {group === 'favorites' && !query
                  ? 'Bấm ngôi sao cạnh báo cáo để truy cập nhanh lần sau.'
                  : 'Thử từ khóa khác hoặc chọn nhóm báo cáo khác.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
