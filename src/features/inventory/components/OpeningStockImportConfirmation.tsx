'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function OpeningStockImportConfirmation({
  open,
  busy,
  count,
  lots,
  warehouse,
  effectiveDate,
  ignored,
  ignoredAck,
  onIgnoredAck,
  onOpenChange,
  onConfirm,
}: {
  readonly open: boolean
  readonly busy: boolean
  readonly count: number
  readonly lots: number
  readonly warehouse: string
  readonly effectiveDate: string
  readonly ignored: readonly string[]
  readonly ignoredAck: boolean
  readonly onIgnoredAck: (value: boolean) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value)
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Tạo phiếu nháp từ {count} dòng?</AlertDialogTitle>
          <AlertDialogDescription>
            Kho: {warehouse} · Ngày ghi nhận: {effectiveDate}. Tồn kho chỉ cập nhật sau khi phiếu
            được duyệt. {lots ? `${lots} lô mới chỉ được tạo trong giao dịch duyệt phiếu.` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {ignored.length ? (
          <label className="flex min-h-11 items-start gap-3 text-sm wrap-anywhere">
            <input
              type="checkbox"
              checked={ignoredAck}
              disabled={busy}
              onChange={(event) => onIgnoredAck(event.target.checked)}
              className="accent-primary mt-1 size-4 shrink-0"
            />
            <span>Tôi đồng ý bỏ qua các trang/cột không ghép: {ignored.join(', ')}.</span>
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Quay lại kiểm tra</AlertDialogCancel>
          <Button disabled={busy || (ignored.length > 0 && !ignoredAck)} onClick={onConfirm}>
            {busy ? 'Đang tạo phiếu nháp…' : 'Xác nhận tạo phiếu nháp'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
