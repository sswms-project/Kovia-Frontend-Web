import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RestockReturnFormValues } from '../../schemas/restock-return.schema'
import type {
  GoodsReturnRequestSummary,
  GoodsReturnRestockOptions,
} from '../../types/stock-issue.types'
import { matchesReturnLocationCode } from '../../utils/return-location-scan'
import { RestockReturnLine } from './RestockReturnLine'

interface RestockReturnDialogProps {
  readonly item: GoodsReturnRequestSummary | null
  readonly form: UseFormReturn<RestockReturnFormValues>
  readonly options: GoodsReturnRestockOptions['items']
  readonly isLoading: boolean
  readonly error: string | null
  readonly onRetry: () => void
  readonly isUncertain?: boolean
  readonly onResolve?: () => void
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: RestockReturnFormValues) => void
}

export function RestockReturnDialog({
  item,
  form,
  options,
  isLoading,
  error,
  onRetry,
  isPending,
  isUncertain = false,
  onResolve,
  onOpenChange,
  onSubmit,
}: RestockReturnDialogProps) {
  const lines = form.watch('items')
  const verified = lines.filter(
    (line) =>
      line.condition === 'Scrap' ||
      matchesReturnLocationCode(
        line.scannedSlotCode ?? '',
        options
          .find((entry) => entry.returnItemId === line.returnItemId)
          ?.conditionOptions?.find((entry) => entry.condition === line.condition)
          ?.options.find((slot) => slot.slotId === line.restockSlotId)
      )
  ).length
  const incomplete = !item || lines.length !== item.items.length || verified !== lines.length
  const locked = isPending || isUncertain
  const disabled = locked || isLoading || Boolean(error)
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!locked) onOpenChange(open)
      }}
    >
      <DialogContent className="flex max-h-[90dvh] min-w-0 flex-col overflow-hidden max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle className="break-words">
            Nhận & cất hàng · {item?.goodsReturnRequestCode}
          </DialogTitle>
          <DialogDescription>
            Kiểm tra tình trạng, chọn vị trí rồi quét mã nơi đã cất hàng.
          </DialogDescription>
          <p className="text-muted-foreground text-sm tabular-nums" role="status">
            Đã kiểm tra {verified}/{lines.length} dòng
          </p>
        </DialogHeader>
        {item && (
          <form
            className="flex min-h-0 flex-1 flex-col gap-3"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {isUncertain && (
              <Alert>
                <AlertDescription className="flex flex-col items-start gap-2">
                  <p>Chưa xác định kết quả. Giữ nguyên nội dung và kiểm tra lại.</p>
                  <Button type="button" variant="outline" disabled={isPending} onClick={onResolve}>
                    Kiểm tra lại kết quả
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <fieldset
              disabled={locked}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain"
            >
              {isLoading && <p role="status">Đang kiểm tra vị trí nhận hàng…</p>}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="flex flex-col items-start gap-2">
                    <p>{error}</p>
                    <Button type="button" variant="outline" onClick={onRetry}>
                      Tải lại nội dung phiếu
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {item.items.map((line, index) => (
                <RestockReturnLine
                  key={line.id}
                  line={line}
                  index={index}
                  form={form}
                  options={
                    options.find((entry) => entry.returnItemId === line.id)?.conditionOptions ?? []
                  }
                  disabled={disabled}
                />
              ))}
            </fieldset>
            <DialogFooter className="bg-card shrink-0 border-t pt-3 pb-[env(safe-area-inset-bottom)] max-sm:[&_button]:min-h-11">
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button type="submit" disabled={disabled || incomplete}>
                {isPending ? 'Đang ghi nhận…' : 'Hoàn tất nhận & cất hàng'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
