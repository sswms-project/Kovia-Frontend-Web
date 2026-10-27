import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RestockReturnFormValues } from '../../schemas/restock-return.schema'
import type {
  GoodsReturnRequestSummary,
  GoodsReturnRestockOptions,
} from '../../types/stock-issue.types'
import {
  RETURN_ITEM_CONDITION_LABELS,
  formatStockIssueQuantity,
} from '../../utils/stock-issue-format'

interface RestockReturnDialogProps {
  readonly item: GoodsReturnRequestSummary | null
  readonly form: UseFormReturn<RestockReturnFormValues>
  readonly options: GoodsReturnRestockOptions['items']
  readonly isLoading: boolean
  readonly error: string | null
  readonly onRetry: () => void
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
  onOpenChange,
  onSubmit,
}: RestockReturnDialogProps) {
  const lines = form.watch('items')
  const incomplete =
    !item ||
    lines.length !== item.items.length ||
    lines.some(
      (line) =>
        line.condition !== 'Scrap' &&
        !options
          .find((entry) => entry.returnItemId === line.returnItemId)
          ?.options.some((option) => option.slotId === line.restockSlotId)
    )

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] min-w-0 flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="min-w-0 shrink-0 pr-6">
          <DialogTitle className="break-words">
            Nhập lại kho {item?.goodsReturnRequestCode}
          </DialogTitle>
          <DialogDescription>
            Kiểm tra vị trí nhận hàng theo nội dung đã duyệt. Hàng hỏng hoặc hết hạn phải đặt cách
            biệt hàng tốt.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <form
            className="flex min-h-0 min-w-0 flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {isLoading ? <p role="status">Đang kiểm tra vị trí nhận hàng…</p> : null}
            {error ? (
              <div role="alert" className="border-destructive shrink-0 border p-3">
                <p>{error}</p>
                <Button type="button" variant="outline" onClick={onRetry}>
                  Thử lại
                </Button>
              </div>
            ) : null}
            <div className="min-h-0 min-w-0 overflow-auto overscroll-contain border [&>[data-slot=table-container]]:overflow-visible">
              <Table className="max-sm:block sm:min-w-[40rem]">
                <TableHeader className="max-sm:sr-only">
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead>Tình trạng đã duyệt</TableHead>
                    <TableHead>Vị trí nhập</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-sm:block">
                  {item.items.map((line, index) => {
                    const condition = line.condition
                    const requiresSlot = condition !== 'Scrap'
                    const slotOptions =
                      options.find((entry) => entry.returnItemId === line.id)?.options ?? []
                    const fieldError = form.formState.errors.items?.[index]?.restockSlotId?.message
                    return (
                      <TableRow
                        key={line.id}
                        className="max-sm:grid max-sm:grid-cols-2 max-sm:gap-3 max-sm:p-3"
                      >
                        <TableCell className="max-sm:col-span-2 max-sm:p-0 max-sm:whitespace-normal">
                          <p className="text-sm font-medium break-words">{line.productName}</p>
                          <p className="text-muted-foreground font-mono text-xs">{line.sku}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums max-sm:p-0 max-sm:text-left">
                          <span className="text-muted-foreground block text-xs sm:sr-only">
                            Số lượng
                          </span>
                          {formatStockIssueQuantity(line.quantity)} {line.unitName}
                        </TableCell>
                        <TableCell className="max-sm:p-0">
                          <span className="text-muted-foreground block text-xs sm:sr-only">
                            Tình trạng đã duyệt
                          </span>
                          {RETURN_ITEM_CONDITION_LABELS[line.condition]}
                        </TableCell>
                        <TableCell className="max-sm:col-span-2 max-sm:p-0">
                          <span className="text-muted-foreground mb-1 block text-xs sm:sr-only">
                            Vị trí nhập
                          </span>
                          {requiresSlot ? (
                            <div className="max-w-sm min-w-48 whitespace-normal">
                              <NativeSelect
                                className="w-full"
                                aria-label={`Vị trí nhập ${line.productName}`}
                                value={lines[index]?.restockSlotId ?? ''}
                                disabled={
                                  isPending ||
                                  isLoading ||
                                  Boolean(error) ||
                                  slotOptions.length === 0
                                }
                                aria-invalid={Boolean(fieldError)}
                                onChange={(event) =>
                                  form.setValue(
                                    `items.${index}.restockSlotId`,
                                    event.target.value || null,
                                    { shouldValidate: true, shouldDirty: true }
                                  )
                                }
                              >
                                <NativeSelectOption value="">Chọn vị trí</NativeSelectOption>
                                {slotOptions.map((slot) => (
                                  <NativeSelectOption key={slot.slotId} value={slot.slotId}>
                                    {slot.path}
                                    {slot.isOriginalSlot ? ' · Vị trí lấy hàng cũ' : ''}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              {!isLoading && !error && slotOptions.length === 0 ? (
                                <p className="text-destructive mt-1 text-xs">
                                  Chưa có vị trí đủ điều kiện nhận toàn bộ dòng hàng này.
                                </p>
                              ) : null}
                              {fieldError ? (
                                <p role="alert" className="text-destructive mt-1 text-xs">
                                  {fieldError}
                                </p>
                              ) : null}
                              {!isLoading &&
                              !error &&
                              slotOptions.length > 0 &&
                              !slotOptions.some(
                                (option) => option.slotId === lines[index]?.restockSlotId
                              ) ? (
                                <p role="alert" className="text-destructive mt-1 text-xs">
                                  Vị trí đang chọn không còn phù hợp. Vui lòng chọn lại.
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Không nhập kho</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-muted-foreground shrink-0">
              Nếu số lượng hoặc tình trạng thực tế khác phiếu, cần thu hồi để sửa và duyệt lại trước
              khi nhập kho.
            </p>
            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || isLoading || Boolean(error) || incomplete}
              >
                {isPending ? 'Đang nhập kho…' : 'Xác nhận nhập lại kho'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
