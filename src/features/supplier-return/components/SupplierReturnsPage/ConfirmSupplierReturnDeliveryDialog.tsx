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
import { FieldError, FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { ConfirmSupplierReturnDeliveryFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturn } from '../../types/supplier-return.types'
import { SupplierReturnDeliveryLine } from './SupplierReturnDeliveryLine'

export function ConfirmSupplierReturnDeliveryDialog({
  item,
  form,
  isPending,
  isUncertain = false,
  onResolve,
  onOpenChange,
  onSubmit,
}: {
  readonly item: SupplierReturn | null
  readonly form: UseFormReturn<ConfirmSupplierReturnDeliveryFormValues>
  readonly isUncertain?: boolean
  readonly onResolve?: () => void
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: ConfirmSupplierReturnDeliveryFormValues) => void
}) {
  const itemsError = form.formState.errors.items
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!isPending && !isUncertain) onOpenChange(open)
      }}
    >
      <DialogContent className="flex max-h-[90dvh] min-w-0 flex-col overflow-hidden max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Xác nhận đã giao hàng trả NCC</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.code} · ${item.supplierName}. Phần chưa giao được giải phóng giữ chỗ tại vị trí cũ.`
              : 'Nhập số lượng thực tế đã giao.'}
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <form
            className="flex min-h-0 flex-1 flex-col gap-3"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            {isUncertain && (
              <Alert>
                <AlertDescription className="flex flex-col items-start gap-2">
                  <p>
                    Chưa xác định kết quả thao tác. Giữ nguyên nội dung và kiểm tra lại trước khi
                    tiếp tục.
                  </p>
                  <Button type="button" variant="outline" disabled={isPending} onClick={onResolve}>
                    Kiểm tra lại kết quả
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <fieldset
              disabled={isPending || isUncertain}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain"
            >
              <FieldGroup>
                {item.items.map((line, index) => (
                  <SupplierReturnDeliveryLine
                    key={line.id}
                    line={line}
                    index={index}
                    form={form}
                    disabled={isPending || isUncertain}
                  />
                ))}
                <FieldError errors={[itemsError?.root ?? itemsError]} />
              </FieldGroup>
            </fieldset>
            <DialogFooter className="bg-card shrink-0 border-t pt-3 pb-[env(safe-area-inset-bottom)] max-sm:[&_button]:min-h-11">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isUncertain}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button type="submit" disabled={isPending || isUncertain}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Xác nhận đã giao
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
