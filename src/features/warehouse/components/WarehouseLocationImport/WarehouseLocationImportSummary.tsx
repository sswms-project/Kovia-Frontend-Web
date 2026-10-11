import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WarehouseLocationImportKind } from '../../schemas/warehouse-location-import.schema'
import type { WarehouseLocationImportRow } from '../../types/warehouse-location-import.types'
import { LOCATION_IMPORT_LABELS } from '../../utils/warehouse-location-import'

export function WarehouseLocationImportSummary({
  kinds,
  rows,
  selected,
}: {
  readonly kinds: readonly WarehouseLocationImportKind[]
  readonly rows: readonly WarehouseLocationImportRow[]
  readonly selected: ReadonlySet<string>
}) {
  return (
    <section className="grid shrink-0 gap-2" aria-label="Thống kê theo loại cấu trúc kho">
      <div
        className={cn(
          'grid gap-2',
          kinds.length === 3
            ? 'md:grid-cols-3'
            : kinds.length === 2
              ? 'sm:grid-cols-2'
              : 'grid-cols-1'
        )}
      >
        {kinds.map((kind) => {
          const items = rows.filter((row) => row.kind === kind)
          const valid = items.filter((row) => row.canSelect)
          const chosen = valid.filter((row) => selected.has(row.rowKey)).length
          const references = items.filter((row) => row.action === 'Reference').length
          const invalid = items.filter((row) => row.action === 'Invalid').length
          return (
            <Card
              key={kind}
              size="sm"
              role="group"
              aria-label={`Thống kê ${LOCATION_IMPORT_LABELS[kind].toLowerCase()}`}
              className="border-border min-w-0 gap-2 border ring-0"
            >
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {LOCATION_IMPORT_LABELS[kind]}
                </CardTitle>
                <span className="text-muted-foreground text-sm tabular-nums">
                  Tổng {items.length} dòng
                </span>
              </CardHeader>
              <CardContent className="grid gap-2">
                <p className="flex flex-wrap items-baseline gap-2">
                  <strong className="text-primary text-2xl tabular-nums">{valid.length}</strong>
                  <span className="text-sm">Hợp lệ để tạo mới</span>
                </p>
                <p className="text-primary text-sm font-semibold tabular-nums">
                  Đã chọn {chosen}/{valid.length} dòng hợp lệ
                </p>
                <dl className="border-border flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-sm">
                  <div className="text-muted-foreground flex gap-1">
                    <dt>Đã có</dt>
                    <dd className="font-semibold tabular-nums">{references}</dd>
                  </div>
                  <div
                    className={cn(
                      'flex gap-1',
                      invalid > 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    <dt>Cần sửa</dt>
                    <dd className="font-semibold tabular-nums">{invalid}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
