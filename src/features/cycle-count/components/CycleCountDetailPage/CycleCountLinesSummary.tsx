'use client'

import Link from 'next/link'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatCount, formatCountDifference } from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'

const PREVIEW_VARIANCE_LIMIT = 5

interface CycleCountLinesSummaryProps {
  readonly detail: CycleCountDetail
  readonly countedCount: number
  // null khi tồn hệ thống đang bị ẩn (kiểm kê mù) nên không tính được số dòng lệch.
  readonly varianceCount: number | null
}

function Stat({
  label,
  value,
  tone,
}: {
  readonly label: string
  readonly value: string
  readonly tone?: 'destructive'
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          'text-sm font-semibold tabular-nums',
          tone === 'destructive' && 'text-destructive'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** Tóm tắt bảng dòng kiểm đếm trên trang phiếu; bảng đầy đủ nằm ở trang chi tiết kiểm đếm. */
export function CycleCountLinesSummary({
  detail,
  countedCount,
  varianceCount,
}: CycleCountLinesSummaryProps) {
  const total = detail.items.length
  const percent = total === 0 ? 0 : (countedCount / total) * 100
  const damagedLineCount = detail.items.filter(
    (item) => (item.countedDamagedQuantity ?? 0) > 0
  ).length
  const varianceItems =
    varianceCount === null
      ? []
      : detail.items.filter((item) => item.difference !== null && item.difference !== 0)
  const previewItems = varianceItems.slice(0, PREVIEW_VARIANCE_LIMIT)

  return (
    <section className="bg-card shrink-0 border" aria-label="Tóm tắt dòng kiểm đếm">
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5">
        <h2 className="text-sm font-semibold">Dòng kiểm đếm</h2>
        <div className="flex gap-2 sm:ml-auto">
          {varianceItems.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={APP_ROUTES.cycleCountLines(detail.id, 'variance')}>
                Xem {varianceItems.length} dòng lệch
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={APP_ROUTES.cycleCountLines(detail.id)}>
              <ListChecks aria-hidden="true" />
              Mở chi tiết kiểm đếm
            </Link>
          </Button>
        </div>
      </header>
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{countedCount}</span>
            <span className="text-muted-foreground"> / {total} dòng đã đếm</span>
          </p>
          <Progress value={percent} className="h-1.5" aria-label="Tiến độ đếm" />
        </div>
        <dl className="grid grid-cols-3 gap-x-6">
          <Stat
            label="Dòng lệch"
            value={varianceCount === null ? 'Đã ẩn' : String(varianceCount)}
            tone={varianceCount ? 'destructive' : undefined}
          />
          <Stat
            label="Dòng có hàng hỏng"
            value={String(damagedLineCount)}
            tone={damagedLineCount > 0 ? 'destructive' : undefined}
          />
          <Stat label="Vòng đếm" value={String(detail.recountRound + 1)} />
        </dl>
      </div>
      {previewItems.length > 0 ? (
        <ul className="divide-border divide-y border-t text-sm">
          {previewItems.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {item.productSku} · {formatStockLocation(item)}
                </p>
              </div>
              <p className="text-right tabular-nums">
                <span className="text-muted-foreground">
                  {formatCount(item.systemQuantity)} → {formatCount(item.countedQuantity)}{' '}
                </span>
                <b className={cn((item.difference ?? 0) < 0 && 'text-destructive')}>
                  {formatCountDifference(item.difference)}
                </b>
              </p>
            </li>
          ))}
          {varianceItems.length > previewItems.length ? (
            <li className="text-muted-foreground px-3 py-1.5 text-xs">
              Còn {varianceItems.length - previewItems.length} dòng lệch khác trong chi tiết kiểm
              đếm.
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  )
}
