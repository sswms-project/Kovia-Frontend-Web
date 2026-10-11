import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { APP_ROUTES } from '@/routes/app-routes'
import type { ForecastWorkspace } from '../../hooks/use-forecast-workspace'
import { formatInventoryQuantity } from '../../utils/inventory-format'

export function ReplenishmentReviewDialog({
  workspace,
  canReview,
  canViewInbound,
}: {
  readonly workspace: ForecastWorkspace
  readonly canReview: boolean
  readonly canViewInbound: boolean
}) {
  const item = workspace.selected
  const explanation = item?.explanation
  const errors = workspace.reviewForm.formState.errors
  const pending = workspace.isReviewing
  const editable = item?.status === 'New' && canReview
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !pending) workspace.closeReview()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kiểm tra nháp bổ sung</DialogTitle>
          <DialogDescription>
            {item?.sku} · {item?.productName}. Nháp chưa thay đổi tồn, chưa gửi duyệt và chưa đặt
            mua hàng.
          </DialogDescription>
        </DialogHeader>
        {explanation ? (
          <>
            <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-lg border p-3 text-xs sm:grid-cols-3">
              {[
                ['Tồn khả dụng', explanation.availableQuantity],
                ['Hàng đang nhập', explanation.incomingQuantity],
                ['Hàng chờ cất', explanation.awaitingPutawayQuantity],
                ['Kế hoạch khác', explanation.plannedQuantity],
                ['Tồn mục tiêu', explanation.targetQuantity],
                ['Cần bổ sung hiện tại', item?.currentRequiredQuantity],
              ].map(([label, quantity]) => (
                <div key={label}>
                  <p className="text-muted-foreground">{label}</p>
                  <p className="font-semibold tabular-nums">
                    {typeof quantity === 'number' ? formatInventoryQuantity(quantity) : '—'}{' '}
                    {explanation.unitName}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Căn cứ:{' '}
              {explanation.basis === 'Forecast'
                ? 'nhu cầu xuất dự báo + chính sách tồn'
                : 'chính sách tồn (chưa đủ lịch sử dự báo)'}
              . Cửa sổ phủ {explanation.coverageDays} ngày · Lead time{' '}
              {explanation.leadTimeDays ?? 'chưa cấu hình'} ngày. Cập nhật{' '}
              {new Date(explanation.snapshotAt).toLocaleString('vi-VN')}.
            </p>
            {explanation.warning ? (
              <Alert>
                <AlertDescription>{explanation.warning}</AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : null}
        {item?.reviewNotice ? (
          <Alert variant="destructive">
            <AlertDescription>{item.reviewNotice}</AlertDescription>
          </Alert>
        ) : null}
        {editable ? (
          <form onSubmit={workspace.accept} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <Field>
                <FieldLabel htmlFor="replenishment-supplier">Nhà cung cấp</FieldLabel>
                <NativeSelect
                  id="replenishment-supplier"
                  disabled={
                    pending ||
                    workspace.suppliersQuery.isLoading ||
                    workspace.suppliersQuery.isError
                  }
                  {...workspace.reviewForm.register('supplierId')}
                >
                  <NativeSelectOption value="">Chọn nhà cung cấp</NativeSelectOption>
                  {(workspace.suppliersQuery.data ?? [])
                    .filter((supplier) => supplier.supplierStatus === 'Active')
                    .map((supplier) => (
                      <NativeSelectOption key={supplier.id} value={supplier.supplierId}>
                        {supplier.supplierName}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                {errors.supplierId ? (
                  <p className="text-destructive text-xs" role="alert">
                    {errors.supplierId.message}
                  </p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="replenishment-quantity">
                  Lượng nhập ({explanation?.unitName || 'cơ sở'})
                </FieldLabel>
                <Input
                  id="replenishment-quantity"
                  type="number"
                  step={10 ** -(explanation?.quantityPrecision ?? 0)}
                  min={10 ** -(explanation?.quantityPrecision ?? 0)}
                  disabled={pending}
                  {...workspace.reviewForm.register('adjustedQuantity', { valueAsNumber: true })}
                />
                {errors.adjustedQuantity ? (
                  <p className="text-destructive text-xs" role="alert">
                    {errors.adjustedQuantity.message}
                  </p>
                ) : null}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="replenishment-reason">
                Lý do điều chỉnh (bắt buộc khi đổi lượng)
              </FieldLabel>
              <Textarea
                id="replenishment-reason"
                maxLength={1000}
                disabled={pending}
                {...workspace.reviewForm.register('adjustmentReason')}
              />
              {errors.adjustmentReason ? (
                <p className="text-destructive text-xs" role="alert">
                  {errors.adjustmentReason.message}
                </p>
              ) : null}
            </Field>
            {workspace.suppliersQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Không tải được nhà cung cấp.
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => void workspace.suppliersQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {workspace.suppliersQuery.isSuccess &&
            workspace.suppliersQuery.data?.filter(
              (supplier) => supplier.supplierStatus === 'Active'
            ).length === 0 ? (
              <Alert>
                <AlertDescription>
                  Mặt hàng chưa có nhà cung cấp hoạt động. Cấu hình nhà cung cấp rồi kiểm tra lại;
                  nháp chưa thể gửi.
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => item && void workspace.reject(item)}
              >
                Từ chối đề xuất
              </Button>
              <Button
                type="submit"
                disabled={
                  pending ||
                  Boolean(item?.reviewNotice) ||
                  workspace.suppliersQuery.isLoading ||
                  workspace.suppliersQuery.isError
                }
              >
                {pending ? 'Đang lưu…' : 'Chấp nhận nháp'}
              </Button>
            </DialogFooter>
            <p className="text-muted-foreground text-xs">
              Từ chối sẽ hủy nháp tự động chưa chỉnh sửa. Nháp đã chỉnh sửa được giữ lại nhưng bị
              chặn gửi. Chấp nhận chỉ lưu bước kiểm tra; gửi duyệt tại yêu cầu nhập kho.
            </p>
          </form>
        ) : null}
        {item?.inboundRequestId && canViewInbound ? (
          <Button variant="link" asChild>
            <Link href={{ pathname: APP_ROUTES.inboundRequestDetail(item.inboundRequestId) }}>
              Mở yêu cầu nhập đã liên kết ({item.inboundRequestStatus})
            </Link>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
