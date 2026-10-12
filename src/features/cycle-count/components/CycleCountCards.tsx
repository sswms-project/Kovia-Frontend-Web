'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountSummary } from '../types/cycle-count.types'
import {
  formatCycleCountDate,
  formatCycleCountDay,
  getAdjustmentState,
  getOverdueDays,
  hasCountResults,
} from '../utils/cycle-count-format'
import { CycleCountStatusBadge } from './CycleCountStatusBadge'

interface CycleCountCardsProps {
  readonly items: readonly CycleCountSummary[]
  readonly isFetching: boolean
  readonly onPrefetchDetail: (cycleCountId: string) => void
}

/** Danh sách thẻ thay cho bảng 10 cột trên điện thoại; cả thẻ là một liên kết tới chi tiết phiếu. */
export function CycleCountCards({ items, isFetching, onPrefetchDetail }: CycleCountCardsProps) {
  return (
    <ul
      data-slot="operational-list-body"
      aria-label="Danh sách phiếu kiểm kê"
      aria-busy={isFetching}
      className="divide-border divide-y"
    >
      {items.map((item, index) => {
        const overdueDays = getOverdueDays(item.dueDate, item.status)
        const adjustmentState = getAdjustmentState(item)
        const showProgress = hasCountResults(item.status)
        const progressPercent = item.itemCount ? (item.countedItemCount / item.itemCount) * 100 : 0
        return (
          <li
            key={item.id}
            style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 fill-mode-backwards animation-duration-300"
          >
            <Link
              href={APP_ROUTES.cycleCountDetail(item.id)}
              className="active:bg-muted/60 flex min-h-11 flex-col gap-2 p-3"
              onFocus={() => onPrefetchDetail(item.id)}
              onTouchStart={() => onPrefetchDetail(item.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{item.code}</p>
                  <p className="text-sm">{item.warehouseName}</p>
                </div>
                <CycleCountStatusBadge status={item.status} />
              </div>
              <p className="text-muted-foreground text-xs">
                {item.zoneName || 'Toàn kho'} ·{' '}
                {item.isBlindCount ? 'Kiểm kê mù (ẩn tồn)' : 'Kiểm kê thường (hiện tồn)'}
              </p>
              {item.purpose ? <p className="line-clamp-2 text-sm">{item.purpose}</p> : null}
              <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <dt>Lịch kiểm kê</dt>
                  <dd className="text-foreground">{formatCycleCountDate(item.scheduledDate)}</dd>
                </div>
                <div>
                  <dt>Kiểm kê đến ngày</dt>
                  <dd className="text-foreground">
                    {item.dueDate ? formatCycleCountDay(item.dueDate) : '—'}
                    {overdueDays > 0 ? (
                      <Badge variant="destructive" className="ml-1">
                        Quá hạn {overdueDays} ngày
                      </Badge>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Phụ trách</dt>
                  <dd className="text-foreground">{item.assignedToName || 'Chưa phân công'}</dd>
                </div>
                <div>
                  <dt>Dòng lệch</dt>
                  <dd className="text-foreground">
                    {item.varianceItemCount === null || !showProgress ? (
                      '—'
                    ) : item.varianceItemCount > 0 ? (
                      <Badge variant="destructive">{item.varianceItemCount}</Badge>
                    ) : (
                      '0'
                    )}
                  </dd>
                </div>
              </dl>
              {showProgress ? (
                <div>
                  <p className="text-muted-foreground flex justify-between text-xs">
                    <span>Tiến độ</span>
                    <span className="text-foreground font-mono tabular-nums">
                      {item.countedItemCount}/{item.itemCount}
                    </span>
                  </p>
                  <div className="bg-muted mt-1 h-1.5">
                    <div
                      className="bg-primary h-full transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {adjustmentState ? (
                <Badge variant={adjustmentState.variant} className="self-start">
                  {adjustmentState.label}
                </Badge>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
