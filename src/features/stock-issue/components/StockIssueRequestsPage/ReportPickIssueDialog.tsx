'use client'

import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'

interface ReportPickIssueDialogProps {
  readonly order: StockIssueRequestSummary | null
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onConfirm: (reason: string) => void
}

export function ReportPickIssueDialog({
  order,
  isPending,
  onClose,
  onConfirm,
}: ReportPickIssueDialogProps) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  return (
    <AlertDialog
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open && !isPending) {
          setReason('')
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Báo hàng lỗi - phiếu {order?.stockIssueRequestCode}</AlertDialogTitle>
          <AlertDialogDescription>
            Báo hàng không đạt chất lượng khi lấy. Chủ doanh nghiệp sẽ được thông báo; hàng đã lấy
            có thể hoàn tác để trả về kho.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="report-pick-issue-reason">Mô tả vấn đề</FieldLabel>
          <Textarea
            id="report-pick-issue-reason"
            value={reason}
            maxLength={500}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Đóng</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || trimmed.length === 0}
            onClick={(event) => {
              event.preventDefault()
              onConfirm(trimmed)
            }}
          >
            {isPending ? 'Đang xử lý…' : 'Gửi báo cáo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
