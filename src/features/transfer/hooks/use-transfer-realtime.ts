'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { useNotificationHub } from '@/features/platform-services/providers/notification-hub-context'
import {
  TRANSFER_CHANGED_EVENT,
  transferChangedEventSchema,
  type TransferChangedEvent,
} from '../schemas/transfer-realtime.schema'
import { TRANSFER_MUTATION_KEY, invalidateTransferQueries } from './use-transfers'

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

/** Sau thao tác ghi của chính trình duyệt này, tín hiệu realtime dội lại không phải thay đổi của người khác. */
const OWN_WRITE_ECHO_MS = 5000

function describeJoinFailure(scope: string, error: unknown) {
  logger.warn(`[transfers] Không thể tham gia nhóm realtime ${scope}`, error)
}

function isOwnWriteEcho(write: { inFlight: number; settledAt: number }) {
  return write.inFlight > 0 || Date.now() - write.settledAt < OWN_WRITE_ECHO_MS
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
  const ownWriteRef = useRef({ inFlight: 0, settledAt: 0 })
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

  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        const write = ownWriteRef.current
        if (event.type !== 'updated') return
        if (event.mutation.options.mutationKey?.[0] !== TRANSFER_MUTATION_KEY[0]) return
        const { action } = event
        if (action.type === 'pending') write.inFlight += 1
        else if (action.type === 'success' || action.type === 'error') {
          write.inFlight = Math.max(0, write.inFlight - 1)
          write.settledAt = Date.now()
        }
      }),
    [queryClient]
  )

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
      if (autoRefresh) void refresh()
      else if (!isOwnWriteEcho(ownWriteRef.current)) setHasPendingChange(true)
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
