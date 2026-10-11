'use client'

import Link from 'next/link'
import { CircleCheck, Hourglass, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountItem } from '../../types/cycle-count.types'

interface CycleCountAdjustmentBannerProps {
  readonly items: readonly CycleCountItem[]
  readonly canCreateAdjustment: boolean
  readonly isPending: boolean
  readonly onCreateAll: () => void
}

// Phiếu hoàn tất không tự đổi tồn kho: dòng lệch phải qua phiếu điều chỉnh và được người khác duyệt.
export function CycleCountAdjustmentBanner({
  items,
  canCreateAdjustment,
  isPending,
  onCreateAll,
}: CycleCountAdjustmentBannerProps) {
  const variance = items.filter((item) => item.difference !== null && item.difference !== 0)
  if (variance.length === 0) return null
  const missing = variance.filter((item) => !item.activeAdjustmentId)
  const waiting = variance.filter((item) => item.activeAdjustmentStatus === 'Pending')

  if (missing.length > 0)
    return (
      <Alert variant="destructive" className="flex shrink-0 items-center gap-3">
        <TriangleAlert aria-hidden="true" />
        <AlertDescription className="flex-1">
          Có {missing.length}/{variance.length} dòng lệch chưa tạo điều chỉnh tồn. Tồn kho chỉ thay
          đổi sau khi phiếu điều chỉnh được người khác duyệt.
          {canCreateAdjustment ? '' : ' Cần người có quyền tạo điều chỉnh tồn xử lý.'}
        </AlertDescription>
        {canCreateAdjustment ? (
          <Button size="sm" disabled={isPending} onClick={onCreateAll}>
            Tạo một phiếu cho {missing.length} dòng lệch
          </Button>
        ) : null}
      </Alert>
    )

  if (waiting.length > 0)
    return (
      <Alert className="flex shrink-0 items-center gap-3">
        <Hourglass aria-hidden="true" />
        <AlertDescription className="flex-1">
          {waiting.length} phiếu điều chỉnh đang chờ duyệt. Tồn kho cập nhật sau khi được duyệt.
        </AlertDescription>
        <Button asChild size="sm" variant="outline">
          <Link href={APP_ROUTES.stockAdjustments}>Mở trang điều chỉnh tồn</Link>
        </Button>
      </Alert>
    )

  return (
    <Alert className="flex shrink-0 items-center gap-3">
      <CircleCheck aria-hidden="true" />
      <AlertDescription>Mọi dòng lệch đã được điều chỉnh tồn.</AlertDescription>
    </Alert>
  )
}
