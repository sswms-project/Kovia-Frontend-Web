'use client'

import { ShieldCheck } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { GoodsReturnRequestSummary } from '../../types/stock-issue.types'

interface SelfApproveGoodsReturnDialogProps {
  readonly item: GoodsReturnRequestSummary | null
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
}

/** Xác nhận rõ việc tự duyệt yêu cầu trả hàng do chính mình lập; hệ thống ghi nhật ký "Tự duyệt". */
export function SelfApproveGoodsReturnDialog({
  item,
  isPending,
  onClose,
  onConfirm,
}: SelfApproveGoodsReturnDialogProps) {
  return (
    <AlertDialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <ShieldCheck aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Tự duyệt yêu cầu trả hàng?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn là người lập yêu cầu{' '}
            <span className="font-mono">{item?.goodsReturnRequestCode}</span>. Khi tự duyệt, hệ
            thống ghi nhật ký &quot;Tự duyệt&quot; và báo cho kho chuẩn bị nhận hàng, nhập lại kho.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {isPending ? 'Đang duyệt…' : 'Tôi xác nhận tự duyệt'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
