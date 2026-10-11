'use client'

import { useState } from 'react'
import type { TransferDetail } from '../types/transfer.types'
import { useTransferActionRunner } from './use-transfer-action-runner'
import { useSetTransferPutAwaySlotsMutation } from './use-transfer-fulfillment'

export interface PutAwaySlotChoice {
  readonly itemId: string
  readonly destinationSlotId: string | null
}

/**
 * Quản lý kho nhập chọn vị trí cất hàng cho các dòng của phiếu. Hộp thoại chỉ nhận props; hook giữ trạng thái
 * mở và gửi lệnh kèm phiên bản phiếu hiện tại.
 */
export function useTransferPutAwayActions(transfer: TransferDetail | undefined) {
  const run = useTransferActionRunner()
  const [isOpen, setIsOpen] = useState(false)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)
  const mutation = useSetTransferPutAwaySlotsMutation()

  return {
    isOpen,
    /** Dòng được bấm từ bảng đợt xuất; hộp thoại cuộn tới và làm nổi dòng này. */
    focusItemId,
    isPending: mutation.isPending,
    open: (itemId?: string) => {
      setFocusItemId(itemId ?? null)
      setIsOpen(true)
    },
    onOpenChange: (open: boolean) => !open && setIsOpen(false),
    submit: async (slots: readonly PutAwaySlotChoice[]) => {
      if (!transfer?.version || slots.length === 0) return false
      const done = await run(
        () =>
          mutation.mutateAsync({
            transferId: transfer.id,
            request: {
              expectedVersion: transfer.version ?? '',
              slots: slots.map((slot) => ({ ...slot })),
            },
          }),
        'Đã lưu vị trí cất hàng.',
        'Không thể lưu vị trí cất hàng.'
      )
      if (done) setIsOpen(false)
      return done
    },
  }
}
