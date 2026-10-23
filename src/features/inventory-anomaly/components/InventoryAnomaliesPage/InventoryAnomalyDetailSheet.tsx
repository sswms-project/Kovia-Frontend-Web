import type { UseFormReturn } from 'react-hook-form'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { formatInventoryDate } from '@/features/inventory/utils/inventory-format'
import {
  formatReferenceId,
  formatStockMovementQuantity,
  formatStockMovementReference,
  formatStockMovementType,
} from '@/features/inventory/utils/stock-movement-format'
import type { ReviewInventoryAnomalyFormValues } from '../../schemas/review-inventory-anomaly.schema'
import type { AnomalyReviewDecision, InventoryAnomaly } from '../../types/inventory-anomaly.types'
import { formatAnomalyReason } from '../../utils/anomaly-reasons'
import { AnomalyReviewBadge, AnomalySeverityBadge } from './AnomalyBadges'

interface InventoryAnomalyDetailSheetProps {
  readonly anomaly: InventoryAnomaly | null
  readonly form: UseFormReturn<ReviewInventoryAnomalyFormValues>
  readonly canReview: boolean
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: ReviewInventoryAnomalyFormValues) => Promise<void>
}

function DetailRow({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

export function InventoryAnomalyDetailSheet({
  anomaly,
  form,
  canReview,
  isPending,
  onOpenChange,
  onSubmit,
}: InventoryAnomalyDetailSheetProps) {
  const noteError = form.formState.errors.note

  function submit(decision: AnomalyReviewDecision) {
    form.setValue('decision', decision)
    void form.handleSubmit(onSubmit)()
  }

  return (
    <Sheet open={Boolean(anomaly)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Cảnh báo bất thường</SheetTitle>
          <SheetDescription>
            Gợi ý của mô hình Isolation Forest, cần người kiểm tra trước khi kết luận.
          </SheetDescription>
        </SheetHeader>
        {anomaly ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <AnomalySeverityBadge severity={anomaly.severity} />
              <AnomalyReviewBadge status={anomaly.reviewStatus} />
            </div>

            <section aria-labelledby="anomaly-reasons-title" className="flex flex-col gap-2">
              <h3
                id="anomaly-reasons-title"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Sparkles className="text-tertiary size-4" aria-hidden="true" />
                Vì sao bất thường
              </h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {anomaly.reasons.map((reason) => (
                  <li key={reason.code}>{formatAnomalyReason(reason, anomaly)}</li>
                ))}
              </ul>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs">
                  Bất thường hơn {anomaly.percentile.toLocaleString('vi-VN')}% biến động của kho
                  trong 90 ngày
                </p>
                <Progress value={anomaly.percentile} aria-label="Mức bất thường so với kho" />
              </div>
            </section>

            <section aria-labelledby="anomaly-movement-title" className="flex flex-col gap-2">
              <h3 id="anomaly-movement-title" className="text-sm font-semibold">
                Giao dịch
              </h3>
              <dl className="flex flex-col gap-1.5">
                <DetailRow label="Sản phẩm">
                  {anomaly.productName}{' '}
                  <span className="text-muted-foreground font-mono text-xs" translate="no">
                    {anomaly.sku}
                  </span>
                </DetailRow>
                <DetailRow label="Kho">{anomaly.warehouseName}</DetailRow>
                <DetailRow label="Loại">{formatStockMovementType(anomaly.movementType)}</DetailRow>
                <DetailRow label="Số lượng">
                  <span className="font-mono tabular-nums">
                    {formatStockMovementQuantity(anomaly.quantityChange)} {anomaly.unitName ?? ''}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    (còn {formatStockMovementQuantity(anomaly.balanceAfter).replace('+', '')} tại vị
                    trí)
                  </span>
                </DetailRow>
                <DetailRow label="Thời gian">{formatInventoryDate(anomaly.occurredAt)}</DetailRow>
                <DetailRow label="Người thực hiện">
                  {anomaly.performedByName || 'Chưa xác định'}
                </DetailRow>
                <DetailRow label="Chứng từ">
                  {formatStockMovementReference(anomaly.referenceType)}{' '}
                  <span
                    className="text-muted-foreground font-mono text-xs"
                    title={anomaly.referenceId}
                  >
                    {formatReferenceId(anomaly.referenceId)}
                  </span>
                </DetailRow>
              </dl>
            </section>

            {anomaly.reviewStatus !== 'Open' ? (
              <section aria-labelledby="anomaly-review-title" className="flex flex-col gap-2">
                <h3 id="anomaly-review-title" className="text-sm font-semibold">
                  Kết luận
                </h3>
                <dl className="flex flex-col gap-1.5">
                  <DetailRow label="Người xem xét">
                    {anomaly.reviewedByName ?? 'Chưa xác định'}
                  </DetailRow>
                  <DetailRow label="Thời điểm">{formatInventoryDate(anomaly.reviewedAt)}</DetailRow>
                  <DetailRow label="Ghi chú">{anomaly.reviewNote ?? '—'}</DetailRow>
                </dl>
              </section>
            ) : canReview ? (
              <div className="flex flex-col gap-2">
                <Field data-invalid={Boolean(noteError)}>
                  <FieldLabel htmlFor="anomaly-review-note">Ghi chú xem xét</FieldLabel>
                  <Textarea
                    id="anomaly-review-note"
                    rows={3}
                    placeholder="Bắt buộc khi xác nhận bất thường: đã kiểm tra gì, xử lý ra sao."
                    aria-invalid={Boolean(noteError)}
                    {...form.register('note')}
                  />
                  <FieldError errors={[noteError]} />
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}
        {anomaly?.reviewStatus === 'Open' && canReview ? (
          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => submit('Dismissed')}
            >
              Bình thường
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => submit('Confirmed')}
            >
              {isPending ? <Spinner aria-hidden="true" /> : null}
              Xác nhận bất thường
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
