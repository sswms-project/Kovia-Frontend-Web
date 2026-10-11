import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountItem } from '../../types/cycle-count.types'
import { formatCount } from '../../utils/cycle-count-format'

interface CycleCountResolutionSummaryProps {
  readonly items: readonly CycleCountItem[]
}

export function CycleCountResolutionSummary({ items }: CycleCountResolutionSummaryProps) {
  const varianceItems = items.filter((item) => item.difference !== null && item.difference !== 0)
  const pending = varianceItems.filter((item) => item.activeAdjustmentStatus === 'Pending').length
  const approved = varianceItems.filter((item) => item.activeAdjustmentStatus === 'Approved').length
  const unresolved = varianceItems.length - pending - approved
  const damagedItems = items.filter((item) => (item.countedDamagedQuantity ?? 0) > 0)
  const damagedTotal = damagedItems.reduce(
    (sum, item) => sum + (item.countedDamagedQuantity ?? 0),
    0
  )

  return (
    <section
      aria-label="Xử lý chênh lệch"
      className="bg-card flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border px-4 py-2 text-sm"
    >
      <h2 className="font-semibold">Xử lý chênh lệch</h2>
      <p>
        <span className="font-semibold tabular-nums">{varianceItems.length}</span> dòng lệch
      </p>
      <p className="text-muted-foreground">
        Chưa có đề nghị{' '}
        <span className="text-foreground font-semibold tabular-nums">{unresolved}</span>
        {' · '}Chờ duyệt{' '}
        <span className="text-foreground font-semibold tabular-nums">{pending}</span>
        {' · '}Đã duyệt{' '}
        <span className="text-foreground font-semibold tabular-nums">{approved}</span>
      </p>
      {damagedItems.length > 0 ? (
        <p className="text-destructive ml-auto flex items-center gap-2">
          Ghi nhận hỏng{' '}
          <span className="font-semibold tabular-nums">{formatCount(damagedTotal)}</span> đơn vị ở{' '}
          <span className="font-semibold tabular-nums">{damagedItems.length}</span> dòng.
          {/* Chuyển chất lượng tồn phải qua báo hỏng có bằng chứng, không tự động từ kiểm kê. */}
          <Button asChild size="sm" variant="outline">
            <Link href={APP_ROUTES.inventoryDamageCases}>Lập báo cáo hàng hỏng</Link>
          </Button>
        </p>
      ) : null}
    </section>
  )
}
