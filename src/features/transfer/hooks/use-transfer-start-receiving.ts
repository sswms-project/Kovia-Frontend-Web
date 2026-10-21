'use client'

import { useRouter } from 'nextjs-toploader/app'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferShipment } from '../types/transfer.types'

export function useTransferStartReceiving(transferId: string) {
  const router = useRouter()
  return {
    isPending: false,
    notice: null,
    start: async (shipment: TransferShipment) => {
      // Capture the actual receiving location before sending a start command.
      router.push(APP_ROUTES.transferReceiveTask(transferId, shipment.id))
    },
  }
}
