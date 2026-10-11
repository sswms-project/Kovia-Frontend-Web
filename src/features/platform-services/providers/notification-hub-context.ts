'use client'

import { createContext, useContext } from 'react'
import type { HubConnection } from '@microsoft/signalr'

export interface NotificationHubSnapshot {
  /** Null khi chưa kết nối hoặc đang kết nối lại; chỉ gọi hub khi có giá trị. */
  readonly connection: HubConnection | null
  /** Tăng sau mỗi lần kết nối hoặc kết nối lại thành công để các nhóm tự tham gia lại. */
  readonly session: number
}

export const NotificationHubContext = createContext<NotificationHubSnapshot>({
  connection: null,
  session: 0,
})

export function useNotificationHub(): NotificationHubSnapshot {
  return useContext(NotificationHubContext)
}
