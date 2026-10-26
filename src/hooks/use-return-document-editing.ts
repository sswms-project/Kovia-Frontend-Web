import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getApiErrorMessage } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { returnDocumentService } from '@/services/return-document.service'
import {
  returnDocumentReasonSchema,
  type ReturnDocumentReasonValues,
} from '@/schemas/return-document.schema'
import type {
  ReturnDocumentAction,
  ReturnDocumentKind,
  ReturnDocumentVersion,
} from '@/types/return-document'

export function useReturnDocumentEditing(
  kind: ReturnDocumentKind,
  document: ReturnDocumentVersion | null | undefined,
  listHref: string
) {
  const router = useRouter()
  const client = useQueryClient()
  const [action, setAction] = useState<ReturnDocumentAction | null>(null)
  const snapshot = useRef<{ id: string; expectedVersion: string; commandId: string } | null>(null)
  const lock = useRef(false)
  const form = useForm<ReturnDocumentReasonValues>({
    resolver: zodResolver(returnDocumentReasonSchema),
    defaultValues: { reason: '' },
  })
  const mutation = useMutation({
    retry: false,
    mutationFn: ({ action: next, reason }: { action: ReturnDocumentAction; reason: string }) => {
      if (!snapshot.current) throw new Error('Thiếu phiên bản phiếu.')
      return returnDocumentService.execute(kind, snapshot.current.id, next, {
        ...snapshot.current,
        reason,
      })
    },
    onError: (error) => logger.error(error),
  })
  function open(next: ReturnDocumentAction) {
    if (lock.current || !document?.version || !document.allowedActions?.includes(next)) return
    snapshot.current = {
      id: document.id,
      expectedVersion: document.version,
      commandId: crypto.randomUUID(),
    }
    form.reset({ reason: '' })
    setAction(next)
  }
  async function submit(values: ReturnDocumentReasonValues) {
    if (!action || lock.current || snapshot.current?.id !== document?.id) return
    if ((action === 'Withdraw' || action === 'Cancel') && !values.reason.trim()) {
      form.setError('reason', { message: 'Vui lòng nhập lý do.' })
      return
    }
    lock.current = true
    try {
      await mutation.mutateAsync({ action, reason: values.reason })
      setAction(null)
      toast.success('Đã cập nhật phiếu.')
      if (action === 'DeleteDraft') router.replace(listHref as Route)
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys[kind].all }),
        client.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
      ])
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Không thể cập nhật phiếu. Tải lại để kiểm tra trạng thái mới nhất.'
        )
      )
    } finally {
      lock.current = false
    }
  }
  return {
    open,
    isPending: mutation.isPending,
    dialog: {
      action,
      form,
      isPending: mutation.isPending,
      onSubmit: submit,
      onClose: () => {
        if (!lock.current) setAction(null)
      },
    },
  }
}

export function useSaveReturnDocument(kind: ReturnDocumentKind) {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: ({
      id,
      expectedVersion,
      commandId,
      content,
    }: {
      id: string
      expectedVersion: string
      commandId: string
      content: unknown
    }) => returnDocumentService.save(kind, id, expectedVersion, commandId, content),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys[kind].all }),
        client.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
      ])
    },
    onError: (error) => logger.error(error),
  })
}
