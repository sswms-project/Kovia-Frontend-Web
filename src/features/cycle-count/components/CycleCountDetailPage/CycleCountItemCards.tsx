'use client'

import Link from 'next/link'
import { History, ImagePlus, LockKeyhole, ScanBarcode, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import { CYCLE_COUNT_NOTE_MAX_LENGTH } from '../../schemas/cycle-count.schema'
import {
  CYCLE_COUNT_QUALITY_LABELS,
  formatCount,
  formatCountDifference,
  formatCycleCountDay,
} from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { StockAdjustmentStatusBadge } from '../CycleCountStatusBadge'
import type { CycleCountItemRowModel } from './types'

interface CycleCountItemCardsProps {
  readonly rows: readonly CycleCountItemRowModel[]
  readonly isPending: boolean
  readonly canSelect: boolean
  readonly canCreateAdjustment: boolean
  readonly isCompleted: boolean
  readonly onQuantityChange: (itemId: string, value: string) => void
  readonly onDamagedChange: (itemId: string, value: string) => void
  readonly onNoteChange: (itemId: string, value: string) => void
  readonly onOpenDamage: (itemId: string) => void
  readonly onToggleSelect: (itemId: string, checked: boolean) => void
  readonly onCreateAdjustment: (itemId: string) => void
}

// Ô nhập dùng text-base (16px) để iOS không tự phóng to trang khi chạm vào, và cao 44px cho ngón tay.
const INPUT_CLASS = 'h-11 w-full min-w-0 text-right font-mono text-base'

/** Danh sách thẻ thay cho bảng 16 cột trên điện thoại: mỗi dòng kiểm kê là một thẻ nhập liệu. */
export function CycleCountItemCards({
  rows,
  isPending,
  canSelect,
  canCreateAdjustment,
  isCompleted,
  onQuantityChange,
  onDamagedChange,
  onNoteChange,
  onOpenDamage,
  onToggleSelect,
  onCreateAdjustment,
}: CycleCountItemCardsProps) {
  if (rows.length === 0)
    return (
      <p
        data-slot="operational-list-body"
        className="text-muted-foreground p-6 text-center text-sm"
      >
        Không có dòng kiểm kê phù hợp.
      </p>
    )

  return (
    <ul
      data-slot="operational-list-body"
      aria-label="Dòng kiểm kê"
      className="divide-border divide-y"
    >
      {rows.map((row) => {
        const { item } = row
        const location = formatStockLocation(item)
        return (
          <li key={item.id} className="flex flex-col gap-3 p-3">
            <div className="flex items-start gap-3">
              {canSelect ? (
                <Checkbox
                  className="mt-0.5 size-5"
                  aria-label={`Chọn ${item.productName} để kiểm đếm lại`}
                  checked={row.selected}
                  // Dòng đang có phiếu điều chỉnh chờ duyệt/đã duyệt không được đếm lại.
                  disabled={isCompleted && Boolean(item.activeAdjustmentId)}
                  onCheckedChange={(checked) => onToggleSelect(item.id, checked === true)}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="leading-snug font-medium">{item.productName}</p>
                <p className="text-muted-foreground font-mono text-xs">{item.productSku}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={row.state.variant}>{row.state.label}</Badge>
                {item.countedQuantity !== null && item.countMethod === 'Scanned' ? (
                  <ScanBarcode className="text-muted-foreground size-4" aria-label="Đã quét mã" />
                ) : null}
              </div>
            </div>

            <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <dt>Vị trí</dt>
                <dd className="text-foreground font-mono">{location}</dd>
              </div>
              <div>
                <dt>Lô / HSD</dt>
                <dd className="text-foreground">
                  <span className="font-mono">{item.lotNumber ?? 'Theo số lượng'}</span>
                  {item.expiryDate ? ` · ${formatCycleCountDay(item.expiryDate)}` : ''}
                </dd>
              </div>
              <div>
                <dt>Chất lượng sổ sách</dt>
                <dd className="mt-0.5">
                  <Badge variant={item.qualityStatus === 'Good' ? 'secondary' : 'outline'}>
                    {CYCLE_COUNT_QUALITY_LABELS[item.qualityStatus] ?? item.qualityStatus}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Đơn vị</dt>
                <dd className="text-foreground">{item.unitName ?? '—'}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs">Sổ sách</p>
                <p className="flex h-11 items-center justify-end font-mono text-base tabular-nums">
                  {item.systemQuantity === null ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <LockKeyhole className="size-3" aria-hidden="true" />
                      Đã ẩn
                    </span>
                  ) : (
                    formatCount(item.systemQuantity)
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`quantity-${item.id}`} className="text-muted-foreground text-xs">
                  Kiểm kê
                </label>
                <Input
                  id={`quantity-${item.id}`}
                  className={INPUT_CLASS}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={row.quantity}
                  disabled={!row.recordable || isPending}
                  aria-invalid={row.quantityInvalid}
                  onChange={(event) => onQuantityChange(item.id, event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`damaged-${item.id}`} className="text-muted-foreground text-xs">
                  Trong đó hỏng
                </label>
                {row.recordable ? (
                  <Input
                    id={`damaged-${item.id}`}
                    className={INPUT_CLASS}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={row.damaged}
                    disabled={isPending || row.quantity === ''}
                    aria-invalid={row.damagedInvalid}
                    onChange={(event) => onDamagedChange(item.id, event.target.value)}
                  />
                ) : (
                  <p
                    className={cn(
                      'flex h-11 items-center justify-end font-mono text-base tabular-nums',
                      (item.countedDamagedQuantity ?? 0) > 0
                        ? 'text-destructive font-semibold'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.countedDamagedQuantity === null
                      ? '—'
                      : formatCount(item.countedDamagedQuantity)}
                  </p>
                )}
              </div>
            </div>

            {row.recordable && row.hasDamage ? (
              <Button
                type="button"
                variant={row.damageIncomplete ? 'destructive' : 'outline'}
                className="h-11 justify-start"
                onClick={() => onOpenDamage(item.id)}
              >
                <ImagePlus aria-hidden="true" />
                {row.damageIncomplete
                  ? 'Thêm ảnh và lý do hàng hỏng'
                  : 'Xem / sửa ảnh và lý do hàng hỏng'}
              </Button>
            ) : null}

            {row.liveDifference !== null ? (
              <p
                className={cn(
                  'flex items-center justify-between text-sm',
                  row.liveDifference < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
                )}
              >
                <span>Chênh lệch</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCountDifference(row.liveDifference)}
                </span>
              </p>
            ) : null}

            {row.recordable ? (
              <Input
                aria-label={`Ghi chú của ${item.productName} tại ${location}`}
                className="h-11 text-base"
                maxLength={CYCLE_COUNT_NOTE_MAX_LENGTH}
                placeholder="Ghi chú (nếu có)"
                value={row.note}
                disabled={isPending}
                onChange={(event) => onNoteChange(item.id, event.target.value)}
              />
            ) : item.note ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Ghi chú: </span>
                {item.note}
              </p>
            ) : null}

            {item.countHistory.length > 0 ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="h-auto min-h-8 p-0 text-xs">
                    <History aria-hidden="true" />
                    {item.countHistory.length} lần đếm trước
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="text-muted-foreground mt-1 space-y-1 text-xs">
                  {item.countHistory.map((history) => (
                    <p key={history.id}>
                      Vòng {history.recountRound}: <b>{formatCount(history.countedQuantity)}</b>
                      {history.systemQuantity !== null
                        ? ` / sổ sách ${formatCount(history.systemQuantity)}`
                        : ''}
                      {history.countedByName ? ` · ${history.countedByName}` : ''}
                      {history.countMethod === 'Scanned' ? ' · quét mã' : ''} ·{' '}
                      {history.recountReason}
                    </p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : null}

            {item.activeAdjustmentId && item.activeAdjustmentStatus ? (
              <Button asChild variant="outline" className="h-11 justify-start">
                <Link href={APP_ROUTES.stockAdjustmentDetail(item.activeAdjustmentId)}>
                  <StockAdjustmentStatusBadge status={item.activeAdjustmentStatus} />
                  Xem điều chỉnh
                </Link>
              </Button>
            ) : isCompleted && row.hasVariance && canCreateAdjustment ? (
              <Button
                variant="outline"
                className="h-11 justify-start"
                onClick={() => onCreateAdjustment(item.id)}
              >
                <SlidersHorizontal aria-hidden="true" />
                Điều chỉnh dòng này
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
