'use client'

import Link from 'next/link'
import { BoxIcon, CircleCheck, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountDetail, CycleCountItem } from '../../types/cycle-count.types'
import { formatCount } from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import type { CycleCountEvidenceActions } from './types'

interface CycleCountDamagePanelProps {
  readonly detail: CycleCountDetail
  readonly canConfirm: boolean
  readonly canOpenDamageCases: boolean
  readonly isPending: boolean
  readonly evidenceActions: Pick<CycleCountEvidenceActions, 'onDownload'>
  readonly onConfirm: (itemIds: string[]) => Promise<boolean>
  readonly onRecountItem: (itemId: string) => void
}

function DamageItemSummary({
  item,
  evidenceActions,
}: {
  readonly item: CycleCountItem
  readonly evidenceActions: Pick<CycleCountEvidenceActions, 'onDownload'>
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-6">
      <div className="min-w-0 sm:w-56">
        <p className="font-medium">{item.productName}</p>
        <p className="text-muted-foreground font-mono text-xs">
          {item.productSku} · {formatStockLocation(item)}
        </p>
        <p className="mt-1 text-sm">
          Hỏng{' '}
          <b className="text-destructive font-semibold tabular-nums">
            {formatCount(item.countedDamagedQuantity)}
          </b>
          {item.countedQuantity === null ? '' : ` / ${formatCount(item.countedQuantity)}`}{' '}
          {item.unitName ?? ''}
        </p>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-muted-foreground text-xs">
          Lý do{item.countedByName ? ` (${item.countedByName})` : ''}
        </p>
        <p className="break-words">{item.damageReason ?? '—'}</p>
        {item.damageEvidence.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {item.damageEvidence.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  className="text-primary max-w-48 truncate text-xs underline-offset-2 hover:underline"
                  onClick={() => evidenceActions.onDownload(file.id, file.fileName)}
                >
                  {file.fileName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Hàng hỏng nhân viên ghi nhận khi đếm: quản lý xác nhận khi phiếu chờ duyệt (bắt buộc trước khi chốt),
 * sau khi chốt thì là danh sách hồ sơ hàng hỏng đã tự tạo.
 */
export function CycleCountDamagePanel({
  detail,
  canConfirm,
  canOpenDamageCases,
  isPending,
  evidenceActions,
  onConfirm,
  onRecountItem,
}: CycleCountDamagePanelProps) {
  const damagedItems = detail.items.filter((item) => (item.countedDamagedQuantity ?? 0) > 0)
  const isReview = detail.status === 'Submitted'
  const isCompleted = detail.status === 'Completed'
  if (damagedItems.length === 0 || (!isReview && !isCompleted)) return null

  const pendingItems = damagedItems.filter((item) => item.damageConfirmedAt === null)
  const needsAttention = isReview && pendingItems.length > 0

  return (
    <section
      aria-label="Hàng hỏng"
      className={cn('bg-card shrink-0 border', needsAttention && 'border-destructive/50')}
    >
      <header
        className={cn(
          'flex flex-wrap items-center gap-2 px-4 py-2 text-sm font-semibold',
          needsAttention ? 'bg-destructive/10 text-destructive' : 'border-b'
        )}
      >
        {isCompleted ? (
          <BoxIcon className="size-4" aria-hidden="true" />
        ) : (
          <TriangleAlert className="size-4" aria-hidden="true" />
        )}
        {isCompleted
          ? `Hàng hỏng ghi nhận khi đếm (${damagedItems.length})`
          : needsAttention
            ? `Hàng hỏng cần xác nhận (${pendingItems.length})`
            : `Hàng hỏng đã xác nhận (${damagedItems.length})`}
        {needsAttention ? (
          <span className="text-xs font-normal sm:ml-auto">
            {canConfirm
              ? 'Phải xác nhận hết trước khi hoàn tất kiểm kê'
              : 'Chờ quản lý xác nhận trước khi hoàn tất kiểm kê'}
          </span>
        ) : null}
        {needsAttention && canConfirm && pendingItems.length > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-sm:h-11 max-sm:w-full"
            disabled={isPending}
            onClick={() => void onConfirm(pendingItems.map((item) => item.id))}
          >
            Xác nhận tất cả
          </Button>
        ) : null}
      </header>
      <ul className="divide-border divide-y">
        {damagedItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <DamageItemSummary item={item} evidenceActions={evidenceActions} />
            {isReview ? (
              item.damageConfirmedAt === null ? (
                canConfirm ? (
                  <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    <Button
                      type="button"
                      size="sm"
                      className="max-sm:h-11"
                      disabled={isPending}
                      onClick={() => void onConfirm([item.id])}
                    >
                      <CircleCheck aria-hidden="true" />
                      Xác nhận hỏng
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="max-sm:h-11"
                      disabled={isPending}
                      onClick={() => onRecountItem(item.id)}
                    >
                      Không hỏng, đếm lại
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline">Chờ xác nhận</Badge>
                )
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  <CircleCheck aria-hidden="true" />
                  Đã xác nhận
                </Badge>
              )
            ) : (
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                {/* Phiếu chốt trước khi có luồng này không có hồ sơ: phải lập tay ở màn hàng hỏng. */}
                <Badge variant={item.damageCaseStatus === 'Resolved' ? 'secondary' : 'outline'}>
                  {item.damageCaseId === null
                    ? 'Chưa có hồ sơ hàng hỏng'
                    : item.damageCaseStatus === 'Resolved'
                      ? 'Đã xử lý'
                      : 'Đang giữ, chờ quyết định'}
                </Badge>
                {canOpenDamageCases ? (
                  <Button asChild variant="link" size="xs" className="h-auto p-0 text-xs">
                    <Link href={APP_ROUTES.inventoryDamageCases}>
                      {item.damageCaseId === null ? 'Lập báo cáo hàng hỏng' : 'Mở hồ sơ hàng hỏng'}
                    </Link>
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
