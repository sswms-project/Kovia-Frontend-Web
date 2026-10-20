'use client'

import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage, logApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'
import { downloadInventoryExport } from '@/lib/excel-download'

export function useExcelDownload<T extends object>(
  enabled: boolean,
  request: (filters: T, signal: AbortSignal) => Promise<{ blob: Blob; fileName: string }>,
  successMessage: string
) {
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (state.user !== previous.user) activeRequest.current?.abort()
    })
    return () => {
      unsubscribe()
      activeRequest.current?.abort()
    }
  }, [enabled])

  const mutation = useMutation({
    retry: false,
    mutationFn: async ({
      filters,
      controller,
      user,
    }: {
      filters: T
      controller: AbortController
      user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>
    }) => {
      try {
        if (controller.signal.aborted) return
        const file = await request(filters, controller.signal)
        if (controller.signal.aborted || useAuthStore.getState().user !== user) return
        downloadInventoryExport(file.blob, file.fileName)
        toast.success(successMessage)
      } catch (error) {
        // The shared Axios interceptor normalizes cancellation errors, so inspect our own signal.
        if (!controller.signal.aborted) throw error
      } finally {
        if (activeRequest.current === controller) activeRequest.current = null
      }
    },
    onError: (error) => {
      logApiError(error)
      toast.error(getApiErrorMessage(error, 'Không thể xuất danh sách. Vui lòng thử lại.'))
    },
  })

  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    mutate: (filters: T) => {
      if (!enabled || activeRequest.current) return
      const user = useAuthStore.getState().user
      if (!user) return
      const controller = new AbortController()
      activeRequest.current = controller
      mutation.mutate({ filters: structuredClone(filters), controller, user })
    },
  }
}
