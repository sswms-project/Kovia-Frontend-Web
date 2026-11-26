'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface StockShortageDialogProps {
  /** Short lines from the server (`getStockShortageMessages`); the dialog is open while this is non-null. */
  readonly messages: readonly string[] | null
  readonly onClose: () => void
  /** Resends the same document with `allowShortage`, keeping it as a planned request. */
  readonly onKeepPlanned: () => void
  readonly isPending?: boolean
}

/**
 * Shown when confirming an AI stock issue draft beyond what can be issued now. Nothing is changed for the user:
 * they reduce the quantities themselves, or deliberately keep a planned request that cannot be picked or shipped
 * until stock is enough.
 */
export function StockShortageDialog({
  messages,
  onClose,
  onKeepPlanned,
  isPending,
}: StockShortageDialogProps) {
  // Keep the last lines while the dialog animates out, so its content does not empty before it disappears.
  const [shown, setShown] = useState(messages)
  if (messages && messages !== shown) setShown(messages)

  return (
    <AlertDialog open={messages !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Không đủ tồn để xuất ngay</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {(shown ?? []).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <p>
                Số liệu được kiểm tại thời điểm lưu. Bạn có thể giảm số lượng, hoặc lập yêu cầu dự
                kiến: phiếu vẫn được lưu nhưng chưa lấy hàng hoặc xuất được cho tới khi đủ tồn.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Điều chỉnh số lượng</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onKeepPlanned}>
            Lập yêu cầu dự kiến
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
