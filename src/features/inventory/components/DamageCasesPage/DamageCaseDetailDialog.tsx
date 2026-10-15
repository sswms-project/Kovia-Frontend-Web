'use client'

import Link from 'next/link'
import { Check, CircleDot, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { DamageCase } from '../../types/inventory.types'
import {
  DAMAGE_DISPOSITION_LABELS,
  DAMAGE_STATUS_LABELS,
  formatDamageEvent,
  formatDamageState,
  formatInventoryDate,
  formatInventoryDateOnly,
  formatInventoryLocation,
  formatInventoryQuantity,
} from '../../utils/inventory-format'
import { DamageEvidenceGallery } from './DamageEvidenceGallery'

interface DamageCaseDetailDialogProps {
  readonly item: DamageCase | null
  // Người xem được phép quyết định xử lý / bổ sung bằng chứng cho hồ sơ này (điều kiện do trang tính).
  readonly canDecide: boolean
  readonly canAddEvidence: boolean
  readonly onClose: () => void
  readonly onDecide: (item: DamageCase) => void
  readonly onAddEvidence: (item: DamageCase) => void
}

type StepState = 'done' | 'current' | 'todo'

interface Step {
  readonly label: string
  readonly hint: string | null
  readonly state: StepState
}

function buildSteps(item: DamageCase): readonly Step[] {
  const isResolved = item.status === 'Resolved'
  return [
    { label: 'Ghi nhận', hint: formatInventoryDate(item.createdAt), state: 'done' },
    {
      label: item.isQuantityConfirmed ? 'Đang giữ' : 'Chờ xác nhận số lượng',
      hint: isResolved ? null : 'chờ quyết định',
      state: isResolved ? 'done' : 'current',
    },
    {
      label: 'Đã quyết định',
      hint: isResolved && item.dispositionAt ? formatInventoryDate(item.dispositionAt) : null,
      state: isResolved ? 'done' : 'todo',
    },
  ]
}

function StatusSteps({ steps }: { readonly steps: readonly Step[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Tiến trình xử lý">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center border text-[10px]',
                step.state === 'done' && 'bg-primary text-primary-foreground border-primary',
                step.state === 'current' && 'border-primary text-primary',
                step.state === 'todo' && 'text-muted-foreground'
              )}
            >
              {step.state === 'done' ? (
                <Check className="size-3" aria-hidden="true" />
              ) : step.state === 'current' ? (
                <CircleDot className="size-3" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'h-px flex-1',
                steps[index + 1] && steps[index + 1]?.state !== 'todo' ? 'bg-primary' : 'bg-border',
                index === steps.length - 1 && 'hidden'
              )}
            />
          </div>
          <p
            className={cn('text-xs font-medium', step.state === 'todo' && 'text-muted-foreground')}
          >
            {step.label}
          </p>
          {step.hint ? <p className="text-muted-foreground text-xs">{step.hint}</p> : null}
        </li>
      ))}
    </ol>
  )
}

function QuantityTile({
  label,
  value,
  unit,
  emphasis,
}: {
  readonly label: string
  readonly value: number
  readonly unit: string | null
  readonly emphasis?: boolean
}) {
  return (
    <div className="bg-muted/50 flex flex-col gap-0.5 border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          emphasis && 'text-destructive'
        )}
      >
        {formatInventoryQuantity(value)}
        {unit ? (
          <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
        ) : null}
      </p>
    </div>
  )
}

function SectionTitle({ children }: { readonly children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  )
}

function isExpired(date: string): boolean {
  return new Date(date).getTime() < Date.now()
}

export function DamageCaseDetailDialog({
  item,
  canDecide,
  canAddEvidence,
  onClose,
  onDecide,
  onAddEvidence,
}: DamageCaseDetailDialogProps) {
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Hồ sơ hàng hỏng</DialogTitle>
          <DialogDescription>
            Ảnh bằng chứng, số lượng và kết quả xử lý của hồ sơ.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="grid gap-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-semibold">{item.productName}</p>
                <p className="text-muted-foreground font-mono text-xs">{item.sku}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.warehouseName} · {formatInventoryLocation(item)}
                </p>
              </div>
              <Badge variant={item.status === 'Open' ? 'outline' : 'secondary'}>
                {DAMAGE_STATUS_LABELS[item.status]}
              </Badge>
            </div>

            <section className="grid gap-2" aria-label="Số lượng">
              {item.isQuantityConfirmed ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <QuantityTile
                      label="Hỏng"
                      value={item.quantity}
                      unit={item.unitName}
                      emphasis
                    />
                    <QuantityTile
                      label="Đã xử lý"
                      value={item.resolvedQuantity}
                      unit={item.unitName}
                    />
                    <QuantityTile
                      label="Còn lại"
                      value={item.remainingQuantity}
                      unit={item.unitName}
                    />
                    <QuantityTile label="Đang giữ" value={item.heldQuantity} unit={item.unitName} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={item.quantity > 0 ? (item.resolvedQuantity / item.quantity) * 100 : 0}
                      aria-label="Tiến độ xử lý số lượng hỏng"
                      className="h-1.5"
                    />
                    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                      {formatInventoryQuantity(item.resolvedQuantity)}/
                      {formatInventoryQuantity(item.quantity)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="bg-muted/50 border px-3 py-2">
                  Chưa xác nhận số lượng hỏng. Hồ sơ đang ở dạng quan sát, cần bổ sung bằng chứng để
                  xác nhận.
                </p>
              )}
            </section>

            <section className="grid gap-2" aria-label="Bằng chứng">
              <SectionTitle>Bằng chứng ({item.evidence.length})</SectionTitle>
              <DamageEvidenceGallery evidence={item.evidence} />
            </section>

            <section className="grid gap-2" aria-label="Thông tin hồ sơ">
              <SectionTitle>Thông tin</SectionTitle>
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Sản phẩm</dt>
                  <dd className="font-medium">
                    {item.productName}
                    <span className="text-muted-foreground block font-mono text-xs font-normal">
                      {item.sku}
                      {item.unitName ? ` · ĐVT ${item.unitName}` : ''}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Vị trí</dt>
                  <dd className="font-medium">
                    {item.warehouseName}
                    <span className="text-muted-foreground block text-xs font-normal">
                      {formatInventoryLocation(item)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Lô / HSD</dt>
                  <dd className="font-medium">
                    {item.lotNumber ?? 'Theo số lượng'}
                    {item.lotExpiryDate ? (
                      <span
                        className={cn(
                          'block text-xs font-normal',
                          isExpired(item.lotExpiryDate)
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        )}
                      >
                        HSD {formatInventoryDateOnly(item.lotExpiryDate)}
                        {isExpired(item.lotExpiryDate) ? ' · đã hết hạn' : ''}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Lý do</dt>
                  <dd className="font-medium break-words">{item.reason || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Người báo</dt>
                  <dd className="font-medium">
                    {item.reportedByName}
                    <span className="text-muted-foreground block text-xs font-normal">
                      {formatInventoryDate(item.createdAt)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Nguồn</dt>
                  <dd className="font-medium">
                    {item.relatedTaskType === 'CycleCount' && item.relatedTaskId ? (
                      <Link
                        href={APP_ROUTES.cycleCountDetail(item.relatedTaskId)}
                        className="text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline"
                      >
                        Phiếu kiểm kê{' '}
                        <span className="font-mono">{item.relatedTaskCode ?? ''}</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </Link>
                    ) : (
                      'Báo hàng hỏng thủ công'
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="grid gap-3" aria-label="Kết quả xử lý">
              <SectionTitle>Kết quả xử lý</SectionTitle>
              <StatusSteps steps={buildSteps(item)} />
              {item.disposition ? (
                <div className="bg-muted/50 grid gap-1 border px-3 py-2">
                  <p className="font-medium">
                    {DAMAGE_DISPOSITION_LABELS[item.disposition]}
                    {item.dispositionByName ? (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · {item.dispositionByName}
                      </span>
                    ) : null}
                    {item.dispositionAt ? (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · {formatInventoryDate(item.dispositionAt)}
                      </span>
                    ) : null}
                  </p>
                  {item.dispositionNote ? (
                    <p className="text-muted-foreground break-words">{item.dispositionNote}</p>
                  ) : null}
                  {item.linkedStockAdjustmentId ? (
                    <Button asChild variant="link" size="xs" className="h-auto justify-start p-0">
                      <Link href={APP_ROUTES.stockAdjustmentDetail(item.linkedStockAdjustmentId)}>
                        Mở phiếu điều chỉnh liên kết
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                  {item.linkedStockIssueRequestId ? (
                    <p className="text-muted-foreground text-xs">
                      Phiếu xuất liên kết:{' '}
                      <span className="font-mono">{item.linkedStockIssueRequestId}</span>
                    </p>
                  ) : null}
                </div>
              ) : item.status === 'Open' ? (
                <p className="bg-muted/50 border px-3 py-2">
                  {item.evidenceRequestedAt
                    ? `Đã yêu cầu bổ sung bằng chứng lúc ${formatInventoryDate(item.evidenceRequestedAt)}. Hàng vẫn đang được giữ.`
                    : 'Hàng đã được giữ, chưa trả về kho khả dụng. Chờ chủ doanh nghiệp quyết định xử lý.'}
                </p>
              ) : null}
            </section>

            <section className="grid gap-2" aria-label="Lịch sử xử lý">
              <SectionTitle>Lịch sử xử lý</SectionTitle>
              {item.history.length ? (
                <ol className="border-border flex flex-col gap-3 border-l pl-3">
                  {item.history.map((event) => (
                    <li key={`${event.createdAt}-${event.action}`}>
                      <p className="font-medium">{formatDamageEvent(event.action)}</p>
                      <p className="text-muted-foreground text-xs">
                        {event.fromState !== event.toState
                          ? `${formatDamageState(event.fromState)} → ${formatDamageState(event.toState)} · `
                          : ''}
                        {event.actorName} · {formatInventoryDate(event.createdAt)}
                      </p>
                      {event.reason ? <p className="break-words">{event.reason}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground">
                  Đã báo bởi {item.reportedByName} · {formatInventoryDate(item.createdAt)}
                </p>
              )}
            </section>
          </div>
        ) : null}
        <DialogFooter className="max-sm:flex-col-reverse">
          <Button variant="outline" className="max-sm:h-11" onClick={onClose}>
            Đóng
          </Button>
          {item && canAddEvidence ? (
            <Button variant="outline" className="max-sm:h-11" onClick={() => onAddEvidence(item)}>
              Bổ sung bằng chứng
            </Button>
          ) : null}
          {item && canDecide ? (
            <Button className="max-sm:h-11" onClick={() => onDecide(item)}>
              Quyết định xử lý
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
