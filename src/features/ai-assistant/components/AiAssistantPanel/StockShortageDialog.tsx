'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
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
}

/**
 * Shown when confirming an AI stock issue or transfer draft that can no longer be issued (stock changed after the
 * draft was made). The server refused it and created nothing; the user reduces the quantity on the draft.
 */
export function StockShortageDialog({ messages, onClose }: StockShortageDialogProps) {
  // Keep the last lines while the dialog animates out, so its content does not empty before it disappears.
  const [shown, setShown] = useState(messages)
  if (messages && messages !== shown) setShown(messages)

  return (
    <AlertDialog open={messages !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Không đủ tồn khả dụng, chưa tạo phiếu</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {(shown ?? []).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <p>
                Tồn kho đã thay đổi sau khi lập bản nháp. Hãy bấm Chỉnh sửa trên bản nháp để giảm số
                lượng, hoặc nhờ trợ lý lập lại yêu cầu.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
