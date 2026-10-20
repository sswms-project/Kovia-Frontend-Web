import type { ReceiptLineRequest } from './inbound.types'

export interface ReceivingLocation {
  id: string
  zoneCode: string
  rackCode: string
  slotCode: string
  displayPath: string
}

export interface CreateReceiptInput {
  inboundRequestId: string
  expectedInboundVersion: string
  receiptCode?: string
  lines: ReceiptLineRequest[]
}

export interface UpdateReceiptInput {
  expectedVersion: string
  receiptCode?: string
  lines: ReceiptLineRequest[]
}
