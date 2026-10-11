'use client'

import type {
  FieldError as FormFieldError,
  UseFormRegisterReturn,
  UseFormReturn,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import type {
  CancelCycleCountFormValues,
  CreateStockAdjustmentVoucherFormValues,
  RecountFormValues,
} from '../../schemas/cycle-count.schema'
import type { CycleCountItem } from '../../types/cycle-count.types'
import { formatCount } from '../../utils/cycle-count-format'
import type { CycleCountDialog } from './types'

interface ReasonFieldProps {
  readonly id: string
  readonly label: string
  readonly placeholder: string
  readonly maxLength: number
  readonly registration: UseFormRegisterReturn
  readonly error?: FormFieldError
}

function ReasonField({ id, label, placeholder, maxLength, registration, error }: ReasonFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        {...registration}
      />
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  )
}

interface CycleCountActionDialogProps {
  readonly dialog: CycleCountDialog | null
  readonly recountForm: UseFormReturn<RecountFormValues>
  readonly voucherForm: UseFormReturn<CreateStockAdjustmentVoucherFormValues>
  readonly cancelForm: UseFormReturn<CancelCycleCountFormValues>
  readonly recountSelectedCount: number
  readonly adjustableItems: readonly CycleCountItem[]
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onConfirm: () => Promise<void>
}

export function CycleCountActionDialog({
  dialog,
  recountForm,
  voucherForm,
  cancelForm,
  recountSelectedCount,
  adjustableItems,
  isPending,
  onClose,
  onConfirm,
}: CycleCountActionDialogProps) {
  const selectedLineIds = voucherForm.watch('cycleCountItemIds')
  function toggleLine(itemId: string, checked: boolean) {
    voucherForm.setValue(
      'cycleCountItemIds',
      checked ? [...selectedLineIds, itemId] : selectedLineIds.filter((id) => id !== itemId),
      { shouldValidate: true }
    )
  }
  const allSelected =
    adjustableItems.length > 0 && adjustableItems.every((item) => selectedLineIds.includes(item.id))
  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className={dialog === 'adjustment' ? 'sm:max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>
            {dialog === 'start'
              ? 'Bắt đầu kiểm kê'
              : dialog === 'recount'
                ? 'Yêu cầu kiểm đếm lại'
                : dialog === 'cancel'
                  ? 'Huỷ phiếu kiểm kê'
                  : `Tạo phiếu điều chỉnh tồn (${selectedLineIds.length}/${adjustableItems.length} dòng)`}
          </DialogTitle>
          <DialogDescription>
            {dialog === 'start'
              ? 'Phiếu chuyển sang Đang kiểm kê, số tồn sổ sách được cập nhật lại theo thời điểm hiện tại và bạn có thể nhập kết quả đếm.'
              : dialog === 'recount'
                ? `Số đếm cũ của ${recountSelectedCount} dòng được giữ trong lịch sử. Với phiếu đã hoàn tất, tồn sổ sách của các dòng này được chụp lại theo hiện tại và phiếu quay về Đang đếm lại.`
                : dialog === 'cancel'
                  ? 'Phạm vi kiểm kê được nhả để tạo phiếu khác. Số đếm đã nhập vẫn được giữ trong lịch sử.'
                  : 'Một phiếu gồm nhiều dòng lệch, số lượng do hệ thống tự tính. Tồn chỉ thay đổi sau khi phiếu được duyệt.'}
          </DialogDescription>
        </DialogHeader>
        {dialog === 'start' ? null : dialog === 'recount' ? (
          <ReasonField
            id="recount-reason"
            label="Lý do kiểm đếm lại"
            placeholder="Ví dụ: Số đếm thực tế chênh lệch với hệ thống…"
            maxLength={500}
            registration={recountForm.register('reason')}
            error={recountForm.formState.errors.reason}
          />
        ) : dialog === 'cancel' ? (
          <ReasonField
            id="cancel-reason"
            label="Lý do huỷ phiếu"
            placeholder="Ví dụ: Tạo nhầm kho hoặc nhân viên phụ trách…"
            maxLength={500}
            registration={cancelForm.register('reason')}
            error={cancelForm.formState.errors.reason}
          />
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Dòng lệch đưa vào phiếu</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  voucherForm.setValue(
                    'cycleCountItemIds',
                    allSelected ? [] : adjustableItems.map((item) => item.id),
                    { shouldValidate: true }
                  )
                }
              >
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </div>
            <ul className="max-h-64 divide-y overflow-auto border text-sm">
              {adjustableItems.map((item) => {
                const checked = selectedLineIds.includes(item.id)
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleLine(item.id, value === true)}
                        aria-label={`Chọn ${item.productSku}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.productName}</span>
                        <span className="text-muted-foreground block truncate font-mono text-xs">
                          {item.productSku} · {item.slotCode}
                          {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-mono text-sm font-semibold ${
                          (item.difference ?? 0) < 0 ? 'text-destructive' : 'text-primary'
                        }`}
                      >
                        {(item.difference ?? 0) > 0 ? '+' : ''}
                        {formatCount(item.difference)}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <FieldError
              errors={
                voucherForm.formState.errors.cycleCountItemIds
                  ? [voucherForm.formState.errors.cycleCountItemIds]
                  : undefined
              }
            />
            <ReasonField
              id="adjustment-reason"
              label="Lý do điều chỉnh tồn kho"
              placeholder="Ví dụ: Điều chỉnh theo kết quả kiểm kê đã xác nhận…"
              maxLength={255}
              registration={voucherForm.register('reason')}
              error={voucherForm.formState.errors.reason}
            />
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={isPending} onClick={() => void onConfirm()}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
