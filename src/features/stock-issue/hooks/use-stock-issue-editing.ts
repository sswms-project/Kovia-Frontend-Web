import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getApiErrorMessage } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  returnDocumentReasonSchema,
  type ReturnDocumentReasonValues,
} from '@/schemas/return-document.schema'
import { stockIssueService } from '../services/stock-issue.service'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

export function useStockIssueEditingActions(id: string) {
  return useQuery({
    queryKey: [...queryKeys.stockIssueRequests.all, 'editing-actions', id],
    enabled: Boolean(id),
    queryFn: () => stockIssueService.getAllowedActions(id),
  })
}

export function useWithdrawStockIssue(document: StockIssueRequestSummary | undefined) {
  const router = useRouter()
  const client = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const snapshot = useRef<{ id: string; expectedVersion: string; commandId: string } | null>(null)
  const lock = useRef(false)
  const form = useForm<ReturnDocumentReasonValues>({
    resolver: zodResolver(returnDocumentReasonSchema),
    defaultValues: { reason: '' },
  })
  const mutation = useMutation({
    retry: false,
    mutationFn: (reason: string) => {
      if (!snapshot.current) throw new Error('Thiếu phiên bản phiếu.')
      return stockIssueService.withdraw(snapshot.current.id, { ...snapshot.current, reason })
    },
    onError: (error) => logger.error(error),
  })
  return {
    open: () => {
      if (lock.current || !document?.version) return
      snapshot.current = {
        id: document.id,
        expectedVersion: document.version,
        commandId: crypto.randomUUID(),
      }
      form.reset({ reason: '' })
      setIsOpen(true)
    },
    dialog: {
      action: isOpen ? ('Withdraw' as const) : null,
      form,
      isPending: mutation.isPending,
      onClose: () => {
        if (!lock.current) setIsOpen(false)
      },
      onSubmit: async ({ reason }: ReturnDocumentReasonValues) => {
        if (lock.current || !snapshot.current || snapshot.current.id !== document?.id) return
        if (!reason.trim()) {
          form.setError('reason', { message: 'Vui lòng nhập lý do.' })
          return
        }
        lock.current = true
        try {
          await mutation.mutateAsync(reason)
          setIsOpen(false)
          await client.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all })
          await client.invalidateQueries({ queryKey: queryKeys.inventory.all })
          router.push(APP_ROUTES.stockIssueRequestEdit(document.id) as Route)
          toast.success('Đã thu hồi về Chờ xử lý để sửa.')
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Không thể thu hồi yêu cầu xuất kho.'))
        } finally {
          lock.current = false
        }
      },
    },
  }
}
