'use client'

import { Controller } from 'react-hook-form'
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
import { Input } from '@/components/ui/input'
import { CameraScanControl } from '@/components/operations/scanning'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { useReceiptDamageIsolation } from '../hooks/use-receipt-damage-isolation'
import { ReceivingLocationPicker } from './ReceivingLocationPicker'

export function ReceiptDamageIsolationDialog({
  state,
}: {
  readonly state: ReturnType<typeof useReceiptDamageIsolation>
}) {
  const {
    register,
    control,
    formState: { errors },
  } = state.form
  const busy = state.mutation.isPending
  return (
    <>
      <Dialog
        open={!!state.target}
        onOpenChange={(open) => {
          if (!open) state.close()
        }}
      >
        <DialogContent
          data-scrollbar="slim"
          className="max-h-[90dvh] overflow-y-auto overscroll-contain"
        >
          <DialogHeader>
            <DialogTitle>Cách biệt hàng hỏng đã nhập</DialogTitle>
            <DialogDescription>
              Chuyển sang vị trí riêng không có hàng đạt/chờ kiểm. Hàng vẫn Hold và thuộc tồn kho;
              không thực hiện trả hàng, sửa chữa hay tiêu hủy.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1">
            Hàng hỏng cần cách biệt
            <NativeSelect {...register('goodsReceiptItemId')} disabled={busy}>
              <NativeSelectOption value="">Chọn sản phẩm</NativeSelectOption>
              {state.target?.items
                .filter((item) => (item.remainingDamageIsolationQuantity ?? 0) > 0)
                .map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.productSKU} · còn {item.remainingDamageIsolationQuantity}{' '}
                    {item.baseUnitName}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </label>
          <ReceivingLocationPicker state={state.location} disabled={busy} />
          <label className="space-y-1">
            Số lượng thực tế đã cách biệt
            <Input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              {...register('quantity', { valueAsNumber: true })}
            />
          </label>
          <label className="space-y-1">
            Mã vị trí thực tế
            <Input
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono text-base sm:h-8 sm:text-sm"
              disabled={busy}
              {...register('confirmedSlotCode')}
            />
          </label>
          <CameraScanControl
            key={state.location.selected?.id ?? 'no-location'}
            label="Mã vị trí cách biệt"
            disabled={busy || state.discard || !state.target}
            mode="single"
            pausedMessage={
              !state.location.selected ? 'Chọn vị trí cách biệt trước khi quét mã.' : undefined
            }
            onCode={(code) => {
              state.form.setValue('confirmedSlotCode', code.trim(), {
                shouldDirty: true,
                shouldValidate: true,
              })
              return true
            }}
          />
          <Controller
            control={control}
            name="physicallySeparated"
            render={({ field }) => (
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                  disabled={busy}
                />
                Tôi xác nhận đã chuyển hàng hỏng sang vị trí riêng
              </label>
            )}
          />
          {Object.entries(errors).map(([name, error]) => (
            <p key={name} role="alert" className="text-destructive text-sm">
              {error.message}
            </p>
          ))}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={state.close}>
              Đóng
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                void state.confirm()
              }}
            >
              Xác nhận cách biệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={state.discard} onOpenChange={state.setDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bỏ thay đổi chưa lưu?</DialogTitle>
            <DialogDescription>
              Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setDiscard(false)}>
              Tiếp tục nhập
            </Button>
            <Button onClick={state.discardChanges}>Bỏ thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
