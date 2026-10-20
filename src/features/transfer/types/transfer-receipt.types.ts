import type { TransferShipmentStatus } from './transfer.types'

export type TransferTaskKind = 'pick' | 'receive' | 'putaway'
export type TransferTaskType = 'TransferPick' | 'TransferReceive' | 'TransferPutAway'

export interface TransferReceiptLot {
  lotId: string | null
  lotNumber: string | null
  expiryDate: string | null
  dispatchedQuantity: number
  initialGoodQuantity: number
  initialDamagedQuantity: number
  initialMissingQuantity: number
  lateReceivedQuantity: number
  actualGoodQuantity: number
}

export interface TransferReceiptSheetLine {
  lineId: string
  itemId: string
  productId: string
  sku: string
  productName: string
  barcode: string | null
  baseUnitName: string
  baseQuantityPrecision: number
  lots: TransferReceiptLot[]
}

export interface TransferReceiptSheet {
  receivingSlotId?: string | null
  arrivalStockPostedAt?: string | null
  keptAtReceiving?: boolean
  transferId: string
  shipmentId: string
  transferCode: string
  shipmentNumber: number
  status: TransferShipmentStatus
  receiptFlowVersion: number
  version: string | null
  arrivedAt: string | null
  arrivedBy: string | null
  receiptSubmittedAt: string | null
  receiptSubmittedBy: string | null
  lines: TransferReceiptSheetLine[]
}

export interface TransferPutAwaySheetRow {
  keptAtReceivingQuantity?: number
  lineId: string
  itemId: string
  productId: string
  sku: string
  productName: string
  baseUnitName: string
  baseQuantityPrecision: number
  lotId: string | null
  lotNumber: string | null
  qualityStatus: 'Good' | 'Damaged'
  actualQuantity: number
  putAwayQuantity: number
  remainingQuantity: number
  planMode: 'Planned' | 'Legacy'
  planBudgets: { slotId: string; slotCode: string; path: string; remainingBudget: number }[]
}

export interface TransferActualPutAway {
  id: string
  lineId: string
  lotId: string | null
  qualityStatus: 'Good' | 'Damaged'
  slotId: string
  path: string
  quantity: number
  isLateReceipt: boolean
  isOffPlan: boolean
  slotCodeUnreadable: boolean
  deviationReasonCode: string | null
  note: string | null
  putAwayBy: string
  putAwayAt: string
}

export interface TransferPutAwaySheet {
  receipt: TransferReceiptSheet
  planVersion: string
  rows: TransferPutAwaySheetRow[]
  putAwayLines: TransferActualPutAway[]
}

export interface StartTransferReceivingRequest {
  receivingSlotId?: string
  scannedSlotCode?: string
  expectedVersion: string
  commandId: string
}

export interface SubmitTransferReceiptEntry {
  lineId: string
  lotId: string | null
  goodQuantity: number
  damagedQuantity: number
  missingQuantity: number
  reasonCode: string | null
  note: string | null
}

export interface SubmitTransferReceiptRequest extends StartTransferReceivingRequest {
  keepAtReceiving?: boolean
  damagedSlotId?: string | null
  scannedDamagedSlotCode?: string | null
  entries: SubmitTransferReceiptEntry[]
}

export interface PutAwayTransferShipmentEntry {
  lineId: string
  lotId: string | null
  qualityStatus: 'Good' | 'Damaged'
  destinationSlotId: string
  quantity: number
  scannedSlotCode: string | null
  scannedProductCode: string | null
  deviationReasonCode: string | null
  note: string | null
  slotCodeUnreadable: boolean
}

export interface PutAwayTransferShipmentRequest extends StartTransferReceivingRequest {
  planVersion: string
  entries: PutAwayTransferShipmentEntry[]
}
