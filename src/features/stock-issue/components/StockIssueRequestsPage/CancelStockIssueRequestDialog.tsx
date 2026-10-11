'use client'

import { Ban } from 'lucide-react'
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

interface CancelStockIssueRequestDialogProps {
  readonly order: StockIssueRequestSummary | null
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onConfirm: (reason: string) => void
}

export function CancelStockIssueRequestDialog({
  order,
  isPending,
  onClose,
  onConfirm,
}: CancelStockIssueRequestDialogProps) {
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
            <Ban aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Huỷ phiếu {order?.stockIssueRequestCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tồn kho đang giữ cho phiếu sẽ được giải phóng. Thao tác này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="cancel-stock-issue-reason">Lý do huỷ</FieldLabel>
          <Textarea
            id="cancel-stock-issue-reason"
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
            {isPending ? 'Đang xử lý…' : 'Huỷ phiếu'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
