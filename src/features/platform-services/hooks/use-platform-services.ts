import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { platformServicesService } from '../services/platform-services.service'
import type { AuditLogQuery, NotificationQuery } from '../types/platform-services.types'

export function useArchivedDocumentQuery(documentType: string, id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['archived-document', documentType, id],
    queryFn: () => platformServicesService.getArchivedDocument(documentType, id),
    enabled,
    retry: false,
  })
}

export function useNotificationsQuery(params: NotificationQuery) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => platformServicesService.getNotifications(params),
  })
}

export function useInfiniteNotificationsQuery(pageSize: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(pageSize),
    queryFn: ({ pageParam }) =>
      platformServicesService.getNotifications({ pageNumber: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber * lastPage.pageSize < lastPage.totalCount
        ? lastPage.pageNumber + 1
        : undefined,
  })
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: platformServicesService.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    onError: (error) => {
      logger.error(error)
      toast.error('Không thể cập nhật trạng thái thông báo.')
    },
  })
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: platformServicesService.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    onError: (error) => {
      logger.error(error)
      toast.error('Không thể đánh dấu tất cả thông báo đã đọc.')
    },
  })
}

export function useAuditLogsQuery(params: AuditLogQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(params),
    queryFn: () => platformServicesService.getAuditLogs(params),
    enabled,
  })
}
