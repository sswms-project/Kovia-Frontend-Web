'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferShipment } from '../types/transfer.types'
import type { StartTransferReceivingRequest } from '../types/transfer-receipt.types'
import { newCommandId } from '../utils/transfer-command-id'
import { describeTransferError } from '../utils/transfer-errors'
import { useStartTransferReceivingMutation } from './use-transfer-receipt'

export function useTransferStartReceiving(transferId: string) {
  const router = useRouter()
  const mutation = useStartTransferReceivingMutation()
  const lock = useRef(false)
  const intents = useRef(new Map<string, StartTransferReceivingRequest>())
  const completed = useRef(new Set<string>())
  const [notice, setNotice] = useState<string | null>(null)
  return {
    isPending: mutation.isPending,
    notice,
    start: async (shipment: TransferShipment) => {
      if (lock.current || !shipment.version) return
      if (completed.current.has(shipment.id) || shipment.status === 'Receiving') {
        router.push(APP_ROUTES.transferReceiveTask(transferId, shipment.id))
        return
      }
      if (shipment.status !== 'InTransit') return
      lock.current = true
      const request = intents.current.get(shipment.id) ?? {
        expectedVersion: shipment.version,
        commandId: newCommandId(),
      }
      intents.current.set(shipment.id, request)
      try {
        await mutation.mutateAsync({ transferId, shipmentId: shipment.id, request })
        completed.current.add(shipment.id)
        intents.current.delete(shipment.id)
        setNotice(null)
        router.push(APP_ROUTES.transferReceiveTask(transferId, shipment.id))
      } catch (error) {
        const result = describeTransferError(error, 'Không thể bắt đầu nhận hàng.')
        setNotice(result.message)
        toast.error(result.message)
        if (result.kind !== 'unknown-result') intents.current.delete(shipment.id)
      } finally {
        lock.current = false
      }
    },
  }
}
