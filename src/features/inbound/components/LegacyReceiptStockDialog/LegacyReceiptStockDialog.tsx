import { Controller } from 'react-hook-form'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { useLegacyReceiptStock } from '../../hooks/use-legacy-receipt-stock'
import { ReceivingLocationPicker } from '../ReceivingLocationPicker'

interface LegacyReceiptStockDialogProps {
  readonly state: ReturnType<typeof useLegacyReceiptStock>
}
export function LegacyReceiptStockDialog({ state }: LegacyReceiptStockDialogProps) {
  const busy = state.uploading || state.mutation.isPending
  return (
    <>
      <Dialog open={!!state.target} onOpenChange={(open) => !open && state.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Đối soát tồn thực nhận {state.target?.receiptCode}</DialogTitle>
            <DialogDescription>
              Chỉ dành cho phiếu trước chuyển đổi. Kiểm đếm hàng còn tại khu nhận và đính kèm bằng
              chứng; hàng đã cất được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <ReceivingLocationPicker state={state.source} disabled={busy} />
          {state.target?.items.map((item, index) => (
            <Field key={item.id}>
              <FieldLabel htmlFor={`legacy-count-${item.id}`}>
                {item.productSKU} · {item.productName}
              </FieldLabel>
              <p className="text-muted-foreground text-sm">
                Theo phiếu còn chưa cất: {item.receivedQuantity - item.putAwayQuantity}{' '}
                {item.baseUnitName}
              </p>
              <Input
                id={`legacy-count-${item.id}`}
                type="number"
                min={0}
                step="0.01"
                placeholder="Nhập số thực tế vừa kiểm đếm"
                disabled={busy}
                {...state.form.register(`lines.${index}.actualHoldQuantity`, {
                  valueAsNumber: true,
                })}
              />
              <FieldError
                errors={[state.form.formState.errors.lines?.[index]?.actualHoldQuantity]}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel htmlFor="legacy-reason">Lý do đối soát</FieldLabel>
            <Textarea
              id="legacy-reason"
              maxLength={500}
              disabled={busy}
              {...state.form.register('reason')}
            />
            <FieldError errors={[state.form.formState.errors.reason]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="legacy-evidence">Bằng chứng số đếm và vị trí thực nhận</FieldLabel>
            <Input
              id="legacy-evidence"
              type="file"
              disabled={busy || state.attachmentNames.length >= 5}
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void state.upload(file)
              }}
            />
            <p className="text-muted-foreground text-sm">
              {state.uploading
                ? 'Đang tải bằng chứng…'
                : `Đã tải ${state.attachmentNames.length}/5 tệp`}
            </p>
            {state.attachmentNames.map((name, index) => (
              <p key={`${index}:${name}`} className="text-sm break-all">
                {name}
              </p>
            ))}
            <FieldError errors={[state.form.formState.errors.evidenceIds]} />
          </Field>
          {state.selfApprovalRequired && (
            <Field>
              <Controller
                name="selfApprovalAcknowledged"
                control={state.form.control}
                render={({ field }) => (
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <Checkbox
                      checked={field.value}
                      disabled={busy}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    Tôi xác nhận tự phê duyệt với quyền đã được cấp.
                  </label>
                )}
              />
              <FieldError errors={[state.form.formState.errors.selfApprovalAcknowledged]} />
            </Field>
          )}
          {state.mutation.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.mutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={state.close}>
              Đóng
            </Button>
            <Button disabled={busy} onClick={() => void state.confirm()}>
              Phê duyệt đối soát có bằng chứng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={state.discardOpen}
        onOpenChange={state.setDiscardOpen}
        onDiscard={state.discard}
      />
    </>
  )
}
