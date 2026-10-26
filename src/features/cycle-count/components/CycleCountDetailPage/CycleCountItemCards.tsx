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
          <li key={item.id} className="flex min-w-0 flex-col gap-4 p-3">
            <div className="flex items-start gap-3">
              {canSelect ? (
                <Checkbox
                  className="mt-0.5 size-5"
                  aria-label={`Chọn ${item.productName} để kiểm đếm lại`}
                  checked={row.selected}
                  // Phiếu đã hoàn tất chỉ đếm lại dòng lệch chưa điều chỉnh và chưa có hồ sơ hỏng.
                  disabled={row.recountBlockReason !== null}
                  title={row.recountBlockReason ?? undefined}
                  onCheckedChange={(checked) => onToggleSelect(item.id, checked === true)}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-base leading-snug font-semibold break-words">
                  {item.productName}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
                  {item.productSku}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={row.state.variant}>{row.state.label}</Badge>
                {item.countedQuantity !== null && item.countMethod === 'Scanned' ? (
                  <ScanBarcode className="text-muted-foreground size-4" aria-label="Đã quét mã" />
                ) : null}
              </div>
            </div>

            <dl className="text-muted-foreground grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 text-xs">
              <div className="col-span-2 min-w-0">
                <dt>Vị trí</dt>
                <dd className="text-foreground mt-1 text-sm leading-relaxed font-medium break-words">
                  {location}
                </dd>
              </div>
              <div className="col-span-2 min-w-0">
                <dt>Lô / HSD</dt>
                <dd className="text-foreground mt-1 break-words">
                  <span className="font-mono">{item.lotNumber ?? 'Không theo lô'}</span>
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

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <p className="text-muted-foreground">Sổ sách</p>
              <p className="font-mono font-medium tabular-nums">
                {item.systemQuantity === null ? (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <LockKeyhole className="size-3" aria-hidden="true" />
                    Ẩn khi kiểm kê mù
                  </span>
                ) : (
                  <>
                    {formatCount(item.systemQuantity)} {item.unitName ?? ''}
                  </>
                )}
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={`quantity-${item.id}`} className="text-muted-foreground text-xs">
                  Số đếm{item.unitName ? ` (${item.unitName})` : ''}
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
                  aria-describedby={row.quantityInvalid ? `quantity-error-${item.id}` : undefined}
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
                    aria-describedby={row.damagedInvalid ? `damaged-error-${item.id}` : undefined}
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

            {row.recordable && row.quantityInvalid ? (
              <p id={`quantity-error-${item.id}`} role="alert" className="text-destructive text-xs">
                Số đếm phải từ 0 và có tối đa 2 chữ số thập phân.
              </p>
            ) : null}
            {row.recordable && row.damagedInvalid ? (
              <p id={`damaged-error-${item.id}`} role="alert" className="text-destructive text-xs">
                Số hỏng phải từ 0 và không vượt số đếm.
              </p>
            ) : null}

            {row.recordable && row.hasDamage && !row.damagedInvalid ? (
              <Button
                type="button"
                variant={row.damageIncomplete ? 'destructive' : 'outline'}
                className="h-auto min-h-11 justify-start text-left whitespace-normal"
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
