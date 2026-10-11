import { FileChartColumn, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReportDefinition } from '../../schemas/warehouse-report.schema'
import { ReportCatalogCard } from './ReportCatalogCard'
import { ForecastPlanningCard } from './ForecastPlanningCard'

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
  const availableGroups = [...new Set(reports.map((report) => report.group))]
  const visible = reports.filter(
    (report) =>
      (group === 'all' ||
        (group === 'favorites' ? favorites.includes(report.type) : report.group === group)) &&
      `${report.name} ${report.description}`
        .toLocaleLowerCase('vi')
        .includes(search.trim().toLocaleLowerCase('vi'))
  )
  const groups = [...new Set(visible.map((report) => report.group))]
  const showForecast =
    canForecast &&
    group === 'all' &&
    'dự báo & bổ sung hàng phân tích lịch sử xuất nhu cầu kế hoạch tồn kho nháp nhập kho'.includes(
      search.trim().toLocaleLowerCase('vi')
    )
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            Phân tích vận hành
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Báo cáo & phân tích</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Theo dõi vận hành kho, phân tích nhu cầu và lập kế hoạch bổ sung hàng.
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
            placeholder="Tìm tên hoặc nội dung báo cáo…"
            className="bg-card h-11 rounded-xl pl-10"
          />
        </label>
      </header>
      <nav aria-label="Nhóm báo cáo" className="flex shrink-0 flex-wrap gap-2 border-b pb-4">
        {[
          ['all', 'Tất cả'],
          ['favorites', 'Yêu thích'],
          ...availableGroups.map((value) => [value, value]),
        ].map(([value, label]) => {
          const count = reports.filter(
            (report) =>
              value === 'all' ||
              (value === 'favorites' ? favorites.includes(report.type) : report.group === value)
          ).length
          return (
            <Button
              key={value}
              variant={group === value ? 'default' : 'ghost'}
              className="rounded-full"
              aria-pressed={group === value}
              onClick={() => onGroupChange(value ?? 'all')}
            >
              {value === 'favorites' ? <Star className="size-4" aria-hidden /> : null}
              {label}
              <span className="bg-muted/30 rounded-full px-1.5 text-xs opacity-75">{count}</span>
            </Button>
          )
        })}
      </nav>
      {errorMessage ? (
        <p
          role="alert"
          className="text-destructive border-destructive/20 bg-destructive/5 shrink-0 rounded-xl border p-4 text-sm"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {showForecast ? (
          <section aria-labelledby="inventory-planning-heading" className="mb-7 space-y-3">
            <h2 id="inventory-planning-heading" className="text-sm font-semibold">
              Kế hoạch tồn kho
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ForecastPlanningCard />
            </div>
          </section>
        ) : null}
        {isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((id) => (
              <Skeleton key={id} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : null}
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 space-y-7 motion-safe:duration-300">
          {groups.map((reportGroup) => (
            <section key={reportGroup} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">{reportGroup}</h2>
                <span className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs">
                  {visible.filter((report) => report.group === reportGroup).length} báo cáo
                </span>
              </div>
              <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible
                  .filter((report) => report.group === reportGroup)
                  .map((report) => (
                    <ReportCatalogCard
                      key={report.type}
                      report={report}
                      isFavorite={favorites.includes(report.type)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
        {!isPending && !errorMessage && visible.length === 0 && !showForecast ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
            <FileChartColumn className="size-8" aria-hidden />
            <p className="text-foreground font-medium">
              {group === 'favorites' && !search
                ? 'Chưa có báo cáo yêu thích'
                : 'Không tìm thấy báo cáo'}
            </p>
            <p className="text-sm">
              {group === 'favorites' && !search
                ? 'Bấm ngôi sao trên báo cáo để truy cập nhanh lần sau.'
                : 'Thử từ khóa khác hoặc chọn một nhóm báo cáo khác.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
