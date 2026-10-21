'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { getTransferClientId } from '../utils/transfer-client'
import { useNotificationHub } from '@/features/platform-services/providers/notification-hub-context'
import {
  TRANSFER_CHANGED_EVENT,
  transferChangedEventSchema,
  type TransferChangedEvent,
} from '../schemas/transfer-realtime.schema'
import { invalidateTransferQueries } from './use-transfers'

interface UseTransferRealtimeOptions {
  /** Phiếu đang xem: tham gia nhóm theo phiếu. */
  readonly transferId?: string | null
  /** Các kho đang theo dõi: tham gia nhóm theo kho (danh sách, công việc). */
  readonly warehouseIds?: readonly string[]
  /** Đặt false ở màn hình đang nhập dở: chỉ báo thay đổi, không tự tải lại. */
  readonly autoRefresh?: boolean
}

export interface TransferRealtimeState {
  readonly lastChange: TransferChangedEvent | null
  /** Có thay đổi từ người khác mà màn hình chưa tải lại (chỉ dùng khi autoRefresh = false). */
  readonly hasPendingChange: boolean
  readonly refresh: () => Promise<unknown>
  readonly dismiss: () => void
}

function describeJoinFailure(scope: string, error: unknown) {
  logger.warn(`[transfers] Không thể tham gia nhóm realtime ${scope}`, error)
}

export function useTransferRealtime({
  transferId = null,
  warehouseIds = [],
  autoRefresh = true,
}: UseTransferRealtimeOptions = {}): TransferRealtimeState {
  const { connection, session } = useNotificationHub()
  const queryClient = useQueryClient()
  const [lastChange, setLastChange] = useState<TransferChangedEvent | null>(null)
  const [hasPendingChange, setHasPendingChange] = useState(false)
  const joinedSessionRef = useRef<number | null>(null)
  const [seenSession, setSeenSession] = useState(session)
  // Kết nối lại có thể làm lỡ tín hiệu: màn hình đang nhập dở chỉ được báo, không tải đè dữ liệu.
  if (session !== seenSession) {
    setSeenSession(session)
    if (!autoRefresh && seenSession > 0) setHasPendingChange(true)
  }
  const warehouseKey = useMemo(() => [...new Set(warehouseIds)].sort().join(','), [warehouseIds])

  const refresh = useCallback(() => {
    setHasPendingChange(false)
    return invalidateTransferQueries(queryClient)
  }, [queryClient])

  const dismiss = useCallback(() => setHasPendingChange(false), [])

  useEffect(() => {
    if (!connection) return
    const warehouses = warehouseKey ? warehouseKey.split(',') : []
    if (!transferId && warehouses.length === 0) return

    const handleChanged = (payload: unknown) => {
      const result = transferChangedEventSchema.safeParse(payload)
      if (!result.success) {
        logger.warn('[transfers] Tín hiệu realtime không hợp lệ', result.error.flatten())
        return
      }
      if (transferId && warehouses.length === 0 && result.data.transferId !== transferId) return
      setLastChange(result.data)
      // Writes own their post-commit read. Events with no origin (older clients/jobs)
      // remain visible; time windows cannot safely identify another user's change.
      if (result.data.originClientId && result.data.originClientId === getTransferClientId()) return
      if (autoRefresh) void refresh()
      else setHasPendingChange(true)
    }

    connection.on(TRANSFER_CHANGED_EVENT, handleChanged)
    if (transferId) {
      connection
        .invoke('JoinTransfer', transferId)
        .catch((error: unknown) => describeJoinFailure(`phiếu ${transferId}`, error))
    }
    for (const warehouseId of warehouses) {
      connection
        .invoke('JoinTransferWarehouse', warehouseId)
        .catch((error: unknown) => describeJoinFailure(`kho ${warehouseId}`, error))
    }
    // Sau khi kết nối lại có thể đã lỡ tín hiệu; server là nguồn đúng nên tải lại.
    if (autoRefresh && joinedSessionRef.current !== null && joinedSessionRef.current !== session) {
      void invalidateTransferQueries(queryClient)
    }
    joinedSessionRef.current = session

    return () => {
      connection.off(TRANSFER_CHANGED_EVENT, handleChanged)
      const leave = (method: string, id: string) =>
        connection.invoke(method, id).catch(() => undefined)
      if (transferId) void leave('LeaveTransfer', transferId)
      for (const warehouseId of warehouses) void leave('LeaveTransferWarehouse', warehouseId)
    }
  }, [autoRefresh, connection, queryClient, refresh, session, transferId, warehouseKey])

  return { lastChange, hasPendingChange, refresh, dismiss }
}
