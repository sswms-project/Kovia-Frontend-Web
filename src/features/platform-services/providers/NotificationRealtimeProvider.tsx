'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getStoredAccessToken } from '@/lib/axios'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { notificationCreatedEventSchema } from '../schemas/platform-services.schema'
import { createNotificationHubConnection } from '../services/notification-realtime.service'
import { getNotificationQueryKeys } from '../utils/platform-services-format'
import { NotificationHubContext, type NotificationHubSnapshot } from './notification-hub-context'

interface NotificationRealtimeProviderProps {
  readonly children: ReactNode
}

const MAX_MANUAL_RESTARTS = 3

export function NotificationRealtimeProvider({ children }: NotificationRealtimeProviderProps) {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const router = useRouter()
  const shownEventsRef = useRef(new Set<string>())
  const [hub, setHub] = useState<NotificationHubSnapshot>({ connection: null, session: 0 })

  useEffect(() => {
    if (!user) return
    let disposed = false
    let isStarting = false
    let restartAttempts = 0
    let restartTimer: ReturnType<typeof setTimeout> | undefined
    const connection = createNotificationHubConnection(() => getStoredAccessToken() ?? '')

    const invalidateNotifications = () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })

    connection.on('NotificationCreated', (payload: unknown) => {
      const result = notificationCreatedEventSchema.safeParse(payload)
      if (!result.success) {
        logger.warn('[notifications] Invalid realtime payload', result.error.flatten())
        return
      }
      if (result.data.type === 'SessionRevoked') {
        useAuthStore.getState().clearAuth()
        toast.warning('Vai trò của bạn đã thay đổi. Vui lòng đăng nhập lại.', { duration: 6_000 })
        void connection.stop()
        window.location.href = APP_ROUTES.auth.login
        return
      }
      if (!shownEventsRef.current.has(result.data.notificationId)) {
        shownEventsRef.current.add(result.data.notificationId)
        if (shownEventsRef.current.size > 100) shownEventsRef.current.clear()
        toast.info('Bạn có thông báo mới.', {
          duration: 6_000,
          action: {
            label: 'Xem',
            onClick: () => router.push(APP_ROUTES.notifications),
          },
        })
      }
      void invalidateNotifications()
      // Trang đang mở (vd. chi tiết phiếu kiểm kê) tự tải lại thay vì bắt người dùng F5.
      for (const queryKey of getNotificationQueryKeys({
        type: result.data.type,
        referenceType: result.data.referenceType ?? null,
        referenceId: result.data.referenceId ?? null,
      }))
        void queryClient.invalidateQueries({ queryKey })
    })

    const publishConnection = () =>
      setHub((current) => ({ connection, session: current.session + 1 }))
    // onclose của kết nối cũ có thể đến sau khi kết nối mới đã được công bố: chỉ gỡ đúng kết nối này.
    const withdrawConnection = () =>
      setHub((current) =>
        current.connection === connection ? { ...current, connection: null } : current
      )

    connection.onreconnecting(withdrawConnection)
    connection.onreconnected(() => {
      restartAttempts = 0
      publishConnection()
      void invalidateNotifications()
    })

    const start = async () => {
      if (disposed || !getStoredAccessToken()) return
      isStarting = true
      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }
        restartAttempts = 0
        publishConnection()
        await invalidateNotifications()
      } catch (error) {
        if (disposed) return
        logger.warn('[notifications] Realtime connection unavailable', error)
        if (!disposed && restartAttempts < MAX_MANUAL_RESTARTS) {
          restartAttempts += 1
          restartTimer = setTimeout(() => void start(), restartAttempts * 3_000)
        }
      } finally {
        isStarting = false
      }
    }

    connection.onclose(() => {
      withdrawConnection()
      if (!disposed && restartAttempts < MAX_MANUAL_RESTARTS) {
        restartAttempts += 1
        restartTimer = setTimeout(() => void start(), restartAttempts * 3_000)
      }
    })

    void start()
    return () => {
      disposed = true
      if (restartTimer) clearTimeout(restartTimer)
      connection.off('NotificationCreated')
      // SignalR throws when stop() interrupts an in-flight negotiation. In
      // React Strict Mode, let start() settle and close itself instead.
      if (!isStarting) void connection.stop()
    }
  }, [queryClient, router, user])

  return <NotificationHubContext value={hub}>{children}</NotificationHubContext>
}
