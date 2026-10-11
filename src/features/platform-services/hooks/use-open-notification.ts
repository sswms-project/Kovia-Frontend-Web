'use client'

import { useState } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { NotificationItem } from '../types/platform-services.types'
import {
  getNotificationQueryKeys,
  getNotificationReferenceRoute,
} from '../utils/platform-services-format'
import { useMarkNotificationReadMutation } from './use-platform-services'

export function useOpenNotification() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const markReadMutation = useMarkNotificationReadMutation()
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null)

  function markRead(notification: NotificationItem) {
    if (notification.isRead) return
    setPendingNotificationId(notification.id)
    markReadMutation.mutate(notification.id, {
      onSettled: () => setPendingNotificationId(null),
    })
  }

  function open(notification: NotificationItem) {
    markRead(notification)
    const route = getNotificationReferenceRoute(notification)
    if (!route) return
    // Đang đứng đúng trang đích thì push không đổi gì → tải lại dữ liệu để thấy thay đổi.
    if (route === pathname)
      for (const queryKey of getNotificationQueryKeys(notification))
        void queryClient.invalidateQueries({ queryKey })
    else router.push(route as Route)
  }

  return { pendingNotificationId, markRead, open }
}
