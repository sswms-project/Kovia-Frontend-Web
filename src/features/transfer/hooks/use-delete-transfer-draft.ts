import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/routes/app-routes'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { transferService } from '../services/transfer.service'
import type { TransferDetail } from '../types/transfer.types'
import { TRANSFER_MUTATION_KEY, invalidateTransferQueries } from './use-transfers'

export function useDeleteTransferDraft(document: TransferDetail | undefined) {
  const router = useRouter()
  const client = useQueryClient()
  const [snapshot, setSnapshot] = useState<{ id: string; version: string } | null>(null)
  const lock = useRef(false)
  const mutation = useMutation({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    mutationFn: ({ id, version }: { id: string; version: string }) =>
      transferService.deleteDraft(id, version),
    onError: (error) => logger.error(error),
  })
  return {
    open: () => {
      if (!lock.current && document?.version)
        setSnapshot({ id: document.id, version: document.version })
    },
    dialog: {
      open: snapshot !== null,
      isPending: mutation.isPending,
      onOpenChange: (open: boolean) => {
        if (!open && !lock.current) setSnapshot(null)
      },
      onConfirm: async () => {
        if (lock.current || !snapshot || snapshot.id !== document?.id) return
        lock.current = true
        try {
          await mutation.mutateAsync(snapshot)
          setSnapshot(null)
          router.replace(APP_ROUTES.transfers)
          toast.success('Đã xóa nháp và giữ lịch sử.')
          await invalidateTransferQueries(client)
        } catch (error) {
          toast.error(
            getApiErrorMessage(error, 'Không thể xóa nháp. Vui lòng tải lại để đối chiếu.')
          )
        } finally {
          lock.current = false
        }
      },
    },
  }
}
