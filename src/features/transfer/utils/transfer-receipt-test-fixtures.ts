import type {
  TransferReceiptSheet,
  TransferPutAwaySheet,
  TransferPutAwaySheetRow,
} from '../types/transfer-receipt.types'

export const RECEIPT_LINE = '10000000-0000-4000-8000-000000000001'
export const RECEIPT_SLOT = '10000000-0000-4000-8000-000000000002'
export const RECEIPT_LOT = '10000000-0000-4000-8000-000000000003'
export function receiptFixture(
  overrides: Partial<TransferReceiptSheet> = {}
): TransferReceiptSheet {
  return {
    transferId: '20000000-0000-4000-8000-000000000001',
    shipmentId: '20000000-0000-4000-8000-000000000002',
    transferCode: 'DC-QA',
    shipmentNumber: 1,
    status: 'Receiving',
    receiptFlowVersion: 1,
    version: 'AQ==',
    arrivedAt: '2026-10-13T08:00:00Z',
    arrivedBy: null,
    receiptSubmittedAt: null,
    receiptSubmittedBy: null,
    lines: [
      {
        lineId: RECEIPT_LINE,
        itemId: RECEIPT_LINE,
        productId: RECEIPT_LINE,
        sku: 'SKU-01',
        productName: 'Hàng QA',
        barcode: '893001',
        baseUnitName: 'Cái',
        baseQuantityPrecision: 0,
        lots: [
          {
            lotId: null,
            lotNumber: null,
            expiryDate: null,
            dispatchedQuantity: 10,
            initialGoodQuantity: 8,
            initialDamagedQuantity: 2,
            initialMissingQuantity: 0,
            lateReceivedQuantity: 0,
            actualGoodQuantity: 8,
          },
        ],
      },
    ],
    ...overrides,
  }
}
export function putAwayFixture(
  overrides: Partial<TransferPutAwaySheet> = {}
): TransferPutAwaySheet {
  const row: TransferPutAwaySheetRow = {
    lineId: RECEIPT_LINE,
    itemId: RECEIPT_LINE,
    productId: RECEIPT_LINE,
    sku: 'SKU-01',
    productName: 'Hàng QA',
    baseUnitName: 'Cái',
    baseQuantityPrecision: 0,
    lotId: null,
    lotNumber: null,
    qualityStatus: 'Good',
    actualQuantity: 8,
    putAwayQuantity: 0,
    remainingQuantity: 8,
    planMode: 'Planned',
    planBudgets: [
      { slotId: RECEIPT_SLOT, slotCode: 'A-01', path: 'Khu A / Kệ A / A-01', remainingBudget: 6 },
    ],
  }
  return {
    receipt: receiptFixture({
      status: 'AwaitingPutAway',
      receiptSubmittedAt: '2026-10-13T09:00:00Z',
    }),
    planVersion: 'hash-plan-1',
    rows: [row, { ...row, qualityStatus: 'Damaged', actualQuantity: 2, remainingQuantity: 2 }],
    putAwayLines: [],
    ...overrides,
  }
}
