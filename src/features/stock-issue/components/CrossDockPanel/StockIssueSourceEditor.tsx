'use client'

import { useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { sourceFactor } from '../../schemas/stock-issue-sources.schema'
import { useStockIssueSources, type SourceSeed } from '../../hooks/use-stock-issue-sources'
import type {
  StockIssueManualSourceDraft,
  StockIssueRequestSummary,
} from '../../types/stock-issue.types'
import { StockIssueSourceRow } from './StockIssueSourceRow'

export function StockIssueSourceEditor({
  order,
  seed,
  scope,
  draft,
  onDraft,
  disabled,
  supported,
}: {
  readonly order: StockIssueRequestSummary
  readonly seed: SourceSeed
  readonly scope: string
  readonly draft: StockIssueManualSourceDraft | null
  readonly onDraft: (draft: StockIssueManualSourceDraft | null) => void
  readonly disabled: boolean
  readonly supported: boolean
}) {
  const state = useStockIssueSources(order, seed, draft, onDraft)
  const rows = useFieldArray({ control: state.form.control, name: 'allocations' })
  const allocations = useWatch({ control: state.form.control, name: 'allocations' })
  const locked = state.busy || state.uncertain || state.stale || disabled
  const remaining = order.items.filter((item) => item.quantity > item.pickedQuantity)
  // Keep an open/uncertain command mounted if realtime moves the order to another state.
  if (!supported && !state.open && !draft) return null
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium">Nguồn lấy hàng</p>
          <p className="text-muted-foreground">
            {draft
              ? 'Đã chọn nguồn riêng; sẽ kiểm tra và giữ hàng khi giao việc.'
              : 'Mặc định theo FEFO/FIFO. Có thể chọn lại phần chưa lấy.'}
          </p>
          {draft && draft.version !== order.version && (
            <p role="alert" className="text-destructive">
              Phiếu đã thay đổi. Chọn lại nguồn hoặc bỏ phương án trước khi giao việc.
            </p>
          )}
          {draft && (
            <ul className="mt-2 space-y-1">
              {draft.allocations.map((row) => (
                <li key={`${row.itemId}:${row.inventoryStockId}`} className="break-words">
                  {order.items.find((item) => item.id === row.itemId)?.sku} -{' '}
                  {draft.labels?.[row.inventoryStockId] || 'Nguồn đã chọn'}:{' '}
                  {row.quantity /
                    sourceFactor(
                      order.items.find((item) => item.id === row.itemId)?.conversionFactor ?? 1
                    )}{' '}
                  {order.items.find((item) => item.id === row.itemId)?.enteredUnitName}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {draft && (
            <Button type="button" variant="outline" disabled={locked} onClick={() => onDraft(null)}>
              Dùng lại gợi ý
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={locked || !order.version || !remaining.length}
            onClick={state.begin}
          >
            Đổi nguồn lấy hàng
          </Button>
        </div>
      </div>
      <Dialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) state.close()
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden sm:max-w-4xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>Điều chỉnh nguồn lấy hàng · {order.stockIssueRequestCode}</DialogTitle>
            <DialogDescription>
              {order.status === 'Pending'
                ? 'Chọn vị trí/lô và đủ số lượng cho mọi dòng. Chưa giữ hàng đến khi giao việc.'
                : 'Chỉ đổi lượng chưa lấy. Lượng đã lấy và hàng tại điểm chờ xuất giữ nguyên.'}
            </DialogDescription>
          </DialogHeader>
          <form
            id="stock-issue-source-form"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-4"
            onSubmit={state.form.handleSubmit(state.save)}
          >
            {remaining.map((item) => (
              <section key={item.id} className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      {item.sku} - {item.productName}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Đã lấy {item.pickedQuantity / sourceFactor(item.conversionFactor)} · Cần phân
                      bổ{' '}
                      {(item.quantity - item.pickedQuantity) / sourceFactor(item.conversionFactor)}{' '}
                      {item.enteredUnitName}
                    </p>
                    <p className="mt-1 text-sm">
                      Đang phân bổ{' '}
                      {allocations
                        .filter((row) => row.itemId === item.id)
                        .reduce(
                          (sum, row) => sum + (Number.isFinite(row.quantity) ? row.quantity : 0),
                          0
                        )}{' '}
                      /{' '}
                      {(item.quantity - item.pickedQuantity) / sourceFactor(item.conversionFactor)}{' '}
                      {item.enteredUnitName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={locked || rows.fields.length >= 500}
                    onClick={() =>
                      rows.append({ itemId: item.id, inventoryStockId: '', quantity: 1, path: '' })
                    }
                  >
                    + Chia nguồn
                  </Button>
                </div>
                {rows.fields.map((row, index) =>
                  row.itemId === item.id ? (
                    <StockIssueSourceRow
                      key={row.id}
                      order={order}
                      item={item}
                      scope={scope}
                      form={state.form}
                      index={index}
                      disabled={locked}
                      onRemove={() => rows.remove(index)}
                    />
                  ) : null
                )}
              </section>
            ))}
            <label className="block text-sm" htmlFor="source-reason">
              Lý do chọn nguồn khác
            </label>
            <Textarea
              id="source-reason"
              maxLength={500}
              disabled={locked}
              {...state.form.register('reason')}
            />
            {state.form.formState.errors.reason && (
              <p role="alert" className="text-destructive text-sm">
                {state.form.formState.errors.reason.message}
              </p>
            )}
            {state.form.formState.errors.allocations && (
              <p role="alert" className="text-destructive text-sm">
                {state.form.formState.errors.allocations.root?.message ??
                  state.form.formState.errors.allocations.message}
              </p>
            )}
            {state.uncertain && (
              <p role="alert" className="text-sm">
                Chưa xác định được kết quả. Thử lại đúng thao tác để xác minh trước khi đổi phương
                án.
              </p>
            )}
            {state.stale && (
              <p role="alert" className="text-destructive text-sm">
                Phiếu đã thay đổi trong khi chọn nguồn. Đóng phương án này rồi mở lại để lấy dữ liệu
                mới.
              </p>
            )}
          </form>
          <DialogFooter className="shrink-0 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={state.busy || state.uncertain}
              onClick={state.close}
            >
              Đóng
            </Button>
            {state.uncertain ? (
              <Button type="button" disabled={state.busy} onClick={state.retry}>
                Thử lại thao tác
              </Button>
            ) : (
              <Button type="submit" form="stock-issue-source-form" disabled={locked}>
                {state.busy
                  ? 'Đang lưu…'
                  : order.status === 'Pending'
                    ? 'Dùng khi giao việc'
                    : 'Lưu nguồn chưa lấy'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={state.discardOpen} onOpenChange={state.setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi nguồn chưa áp dụng?</AlertDialogTitle>
            <AlertDialogDescription>
              Nguồn đã giữ trên máy chủ và hàng đã lấy không thay đổi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh</AlertDialogCancel>
            <AlertDialogAction onClick={state.finishClose}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={state.navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) state.navigation.cancelDiscard()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ phương án chưa giao việc?</AlertDialogTitle>
            <AlertDialogDescription>
              Phương án chọn nguồn chưa được lưu trên máy chủ. Dữ liệu đã ghi nhận không thay đổi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={state.navigation.confirmDiscard}>
              Rời trang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
