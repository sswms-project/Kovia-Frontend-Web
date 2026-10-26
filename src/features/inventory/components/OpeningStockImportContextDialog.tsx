'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  OpeningStockImportSetupFields,
  type OpeningStockSetupFieldsProps,
} from './OpeningStockImportSetup'

export function OpeningStockImportContextDialog(
  props: OpeningStockSetupFieldsProps & {
    readonly open: boolean
    readonly error: string | null
    readonly onOpenChange: (open: boolean) => void
    readonly onApply: () => void
  }
) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi kho hoặc ngày ghi nhận</DialogTitle>
          <DialogDescription>
            Tệp và ghép cột được giữ lại. Bạn cần kiểm tra lại dữ liệu và lựa chọn cho kho/ngày mới.
          </DialogDescription>
        </DialogHeader>
        <OpeningStockImportSetupFields {...props} />
        {props.error ? (
          <p role="alert" className="text-destructive text-sm">
            {props.error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Giữ nguyên
          </Button>
          <Button disabled={props.busy} onClick={props.onApply}>
            Áp dụng và kiểm tra lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
