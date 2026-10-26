import { useWatch } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { useCrossDock } from '../../hooks/use-cross-dock'
import { CrossDockAllocations } from './CrossDockAllocations'

interface Props {
  readonly state: ReturnType<typeof useCrossDock>
}
export function CrossDockPanel({ state }: Props) {
  const acknowledged = useWatch({ control: state.form.control, name: 'selfApprovalAcknowledged' })
  if (!state.canView) return null
  const demand = state.demand.data
  const waiting = demand && !demand.completedAt && !demand.revokedAt
  const stale = state.plan.isError || state.demand.isError || state.summary.isError
  const busy = state.mutation.isPending
  const confirmation = state.target
  const confirmationPicker =
    confirmation?.action === 'authorize'
      ? (state.pickers.data?.find((picker) => picker.id === confirmation.body.assignedStaffId)
          ?.fullName ?? '')
      : ''
  return (
    <Card className="min-w-0 shrink-0" role="region" aria-label="Kế hoạch lấy hàng">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Kế hoạch lấy hàng</CardTitle>
        <Button variant="outline" disabled={busy} onClick={state.refresh}>
          Tải lại
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Ưu tiên hạn sử dụng trên toàn kho. Cùng hạn mới ưu tiên hàng tại khu nhận để tránh cất rồi
          lấy lại. Nhân viên vẫn xác nhận lấy và xuất thực tế.
        </p>
        {stale && (
          <Alert variant="destructive">
            <AlertTitle>Chưa thể tải dữ liệu mới</AlertTitle>
            <AlertDescription>
              Dữ liệu dưới đây có thể đã cũ. Thao tác dùng dữ liệu lỗi bị khóa; hãy tải lại trước
              khi xác nhận.
            </AlertDescription>
          </Alert>
        )}
        {state.plan.isLoading && <p role="status">Đang tính kế hoạch FEFO…</p>}
        {state.plan.data && (
          <>
            <Alert>
              <AlertTitle>{state.plan.data.decision}</AlertTitle>
              <AlertDescription>
                {state.plan.data.automationEnabled
                  ? 'Máy chủ đã bật tác vụ tự phân bổ.'
                  : 'Tác vụ tự phân bổ chưa bật. Bạn vẫn có thể xem nguồn FEFO.'}{' '}
                Đây là đề xuất tại thời điểm tải, chưa giữ chỗ.
              </AlertDescription>
            </Alert>
            <CrossDockAllocations allocations={state.plan.data.allocations} />
          </>
        )}
        {demand && (
          <Alert>
            <AlertTitle>
              {demand.completedAt
                ? 'Đã phân bổ'
                : demand.revokedAt
                  ? 'Đã thu hồi'
                  : new Date(demand.validUntil).getTime() <= state.now
                    ? 'Đã hết thời hạn cho phép'
                    : 'Đang chờ tự phân bổ'}
            </AlertTitle>
            <AlertDescription>
              {demand.decision} · Hiệu lực đến {formatOperationalDateTime(demand.validUntil)}
              {demand.lastAttemptAt
                ? ` · Lần xét gần nhất ${formatOperationalDateTime(demand.lastAttemptAt)}`
                : ''}
            </AlertDescription>
            {waiting && state.canManage && (
              <Button
                className="mt-2"
                variant="outline"
                disabled={busy || !state.writeReady}
                onClick={state.reviewRevoke}
              >
                Thu hồi cho phép
              </Button>
            )}
          </Alert>
        )}
        {state.canManage && state.plan.data && !waiting && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={state.review}>
            <Field>
              <FieldLabel htmlFor="crossdock-picker">Người lấy hàng</FieldLabel>
              <NativeSelect
                id="crossdock-picker"
                {...state.form.register('assignedStaffId')}
                disabled={busy || !state.authorizeReady}
              >
                <NativeSelectOption value="">Chọn nhân viên đủ điều kiện</NativeSelectOption>
                {state.pickers.data?.map((picker) => (
                  <NativeSelectOption key={picker.id} value={picker.id}>
                    {picker.fullName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{state.form.formState.errors.assignedStaffId?.message}</FieldError>
              {state.pickers.isError && (
                <p role="alert" className="text-destructive text-sm">
                  Chưa tải được nhân viên hợp lệ. Hãy tải lại.
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="crossdock-duration">Thời hạn cho phép</FieldLabel>
              <NativeSelect
                id="crossdock-duration"
                {...state.form.register('hours')}
                disabled={busy || !state.authorizeReady}
              >
                {['4', '8', '24'].map((hours) => (
                  <NativeSelectOption key={hours} value={hours}>
                    {hours} giờ
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {state.canSelfApprove && (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="crossdock-self" className="flex items-center gap-2">
                  <Checkbox
                    id="crossdock-self"
                    checked={acknowledged}
                    disabled={busy}
                    onCheckedChange={(value) =>
                      state.form.setValue('selfApprovalAcknowledged', value === true)
                    }
                  />
                  Xác nhận tự phê duyệt nếu đây là phiên bản do tôi lập/gửi; hệ thống kiểm tra quyền
                  tự duyệt.
                </FieldLabel>
              </Field>
            )}
            <p className="text-muted-foreground text-sm sm:col-span-2">
              Chưa đủ mọi dòng thì tiếp tục chờ, không giữ hàng một phần hay hàng tương lai.
            </p>
            <Button type="submit" disabled={busy || !state.authorizeReady}>
              Xem lại trước khi cho phép
            </Button>
          </form>
        )}
        <details
          className="border-t pt-3"
          onToggle={(event) => state.setSummaryOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-medium">
            Lượng đi thẳng theo SKU · phân bổ trong 30 ngày
          </summary>
          <p className="text-muted-foreground my-2 text-xs">
            Đến {formatOperationalDateTime(state.range.to)}. {state.summary.data?.measurementBasis}{' '}
            Không quy đổi thành phần trăm/thời gian tiết kiệm.
          </p>
          {state.summary.isLoading ? (
            <p role="status">Đang tải thống kê…</p>
          ) : state.summary.isError ? (
            <p role="alert">Chưa có số liệu mới đáng tin cậy.</p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto text-sm">
              {state.summary.data?.products.map((product) => (
                <li key={product.productId} className="py-2">
                  {product.sku} · {product.productName}: đã phân bổ{' '}
                  {formatQuantity(product.allocatedDirectQuantity)}, thực lấy{' '}
                  {formatQuantity(product.confirmedDirectPickedQuantity)}, thực xuất{' '}
                  {formatQuantity(product.confirmedDirectDispatchedQuantity)} {product.baseUnitName}
                </li>
              ))}
              {state.summary.data?.products.length === 0 && (
                <li>Chưa có lượng đi thẳng được ghi nhận trong kỳ này.</li>
              )}
            </ul>
          )}
        </details>
        <AlertDialog
          open={!!state.target}
          onOpenChange={(open) => {
            if (!open) state.cancel()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {state.target?.action === 'revoke'
                  ? 'Thu hồi tự phân bổ?'
                  : 'Cho phép tự động phân bổ phiếu này?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation?.action === 'authorize'
                  ? `Nhân viên: ${confirmationPicker}. Hiệu lực đến ${formatOperationalDateTime(confirmation.body.validUntil)}. Khi đủ hàng và còn quyền, hệ thống giữ chỗ và giao việc; không tự xác nhận xuất hàng.`
                  : 'Nếu việc phân bổ đã hoàn thành, cần dùng luồng hủy/đối soát phiếu hiện hành.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {state.mutation.isError && (
              <p role="alert" className="text-destructive text-sm">
                Chưa xác nhận thành công. Tải lại để đối chiếu; thử lại giữ nguyên nội dung lệnh.
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Quay lại</AlertDialogCancel>
              <AlertDialogAction
                disabled={
                  busy ||
                  !state.writeReady ||
                  (state.target?.action === 'authorize' && !state.authorizeReady)
                }
                onClick={(event) => {
                  event.preventDefault()
                  state.confirm()
                }}
              >
                {busy ? 'Đang xử lý…' : 'Xác nhận'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
