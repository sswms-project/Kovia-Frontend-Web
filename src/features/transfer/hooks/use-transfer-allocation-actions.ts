'use client'

import { useMemo, useRef, useState } from 'react'
import type { TransferAllocationMove, TransferDetail } from '../types/transfer.types'
import { newCommandId } from '../utils/transfer-command-id'
import { useTransferActionRunner } from './use-transfer-action-runner'
import {
  useAdjustTransferAllocationMutation,
  useTransferAllocationOptionsQuery,
} from './use-transfer-fulfillment'

/**
 * Điều chỉnh nơi lấy hàng của phiếu (chủ và quản lý kho xuất). Hộp thoại chỉ nhận props; hook giữ dòng đang chọn,
 * tải các vị trí/lô khả dụng của dòng đó và gửi lệnh chuyển giữ chỗ.
 */
export function useTransferAllocationActions(transfer: TransferDetail | undefined) {
  const run = useTransferActionRunner()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const mutation = useAdjustTransferAllocationMutation()
  // Gửi lại đúng nội dung thì dùng lại mã thao tác để mạng chậm không làm chuyển hai lần.
  const lastAttempt = useRef<{ key: string; commandId: string } | null>(null)

  const items = useMemo(
    () =>
      (transfer?.items ?? [])
        .filter((item) => (item.allocations ?? []).length > 0)
        .map((item) => ({ id: item.id, label: `${item.sku} · ${item.productName}` })),
    [transfer?.items]
  )
  const itemId = selectedItemId || items[0]?.id || ''
  const optionsQuery = useTransferAllocationOptionsQuery(
    isOpen ? (transfer?.id ?? null) : null,
    isOpen ? itemId || null : null
  )

  return {
    isOpen,
    items,
    itemId,
    options: optionsQuery.data ?? [],
    isLoading: optionsQuery.isLoading,
    isError: optionsQuery.isError,
    isPending: mutation.isPending,
    open: () => {
      setSelectedItemId('')
      setIsOpen(true)
    },
    select: setSelectedItemId,
    onOpenChange: (open: boolean) => !open && setIsOpen(false),
    submit: async (moves: TransferAllocationMove[], reason: string) => {
      if (!transfer?.version || moves.length === 0) return false
      const trimmed = reason.trim()
      const key = JSON.stringify({ moves, trimmed, version: transfer.version })
      if (lastAttempt.current?.key !== key) lastAttempt.current = { key, commandId: newCommandId() }
      const commandId = lastAttempt.current.commandId
      const done = await run(
        () =>
          mutation.mutateAsync({
            transferId: transfer.id,
            request: {
              expectedVersion: transfer.version ?? '',
              moves,
              reason: trimmed || null,
              commandId,
            },
          }),
        'Đã điều chỉnh nơi lấy hàng.',
        'Không thể điều chỉnh phân bổ.'
      )
      if (done) {
        lastAttempt.current = null
        setIsOpen(false)
      }
      return done
    },
  }
}
