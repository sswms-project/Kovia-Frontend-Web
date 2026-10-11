import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
  type HubConnection,
  type ILogger,
} from '@microsoft/signalr'
import { logger } from '@/lib/logger'

/**
 * SignalR mặc định in mọi mất kết nối bằng console.error (ví dụ mã 1006 khi máy chủ khởi động lại) và hiện
 * lớp phủ lỗi khi chạy dev, dù nó tự kết nối lại. Chỉ lỗi nghiêm trọng mới ghi ở mức lỗi.
 */
export const realtimeLogger: ILogger = {
  log(level, message) {
    if (level >= LogLevel.Critical) logger.error(`[notifications] ${message}`)
    else if (level >= LogLevel.Warning) logger.warn(`[notifications] ${message}`)
  },
}

export function buildNotificationHubUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:7070'
  const normalized = configuredUrl.replace(/\/+$/, '').replace(/\/api$/i, '')
  return `${normalized}/hubs/notifications`
}

export function createNotificationHubConnection(
  accessTokenFactory: () => string | Promise<string>
): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(buildNotificationHubUrl(), {
      accessTokenFactory,
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents,
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
    .configureLogging(realtimeLogger)
    .build()
}
