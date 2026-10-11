'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { describeTransferError } from '../utils/transfer-errors'
import { invalidateTransferQueries } from './use-transfers'

/**
 * Chạy một lệnh ghi và báo kết quả đúng sự thật: thành công chỉ khi server xác nhận; lệch phiên bản hoặc mất
 * kết nối thì tải lại dữ liệu để người dùng kiểm tra trước khi thao tác lại.
 */
export function useTransferActionRunner() {
  const queryClient = useQueryClient()
  return useCallback(
    async (run: () => Promise<unknown>, successMessage: string, fallbackMessage: string) => {
      try {
        await run()
        toast.success(successMessage)
        return true
      } catch (error) {
        const description = describeTransferError(error, fallbackMessage)
        toast.error(description.message)
        if (description.kind !== 'rejected') void invalidateTransferQueries(queryClient)
        return false
      }
    },
    [queryClient]
  )
}
