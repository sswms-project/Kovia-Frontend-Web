import type { TransferPutAwayPlanLine, TransferReceiveSheet } from '../types/transfer.types'
import { buildTransferItem } from './transfer-test-fixtures'

export const SLOT_A = '80000000-0000-4000-8000-000000000001'
export const SLOT_B = '80000000-0000-4000-8000-000000000002'
export const LINE_ID = '90000000-0000-4000-8000-000000000001'
export const LOT_ID = '90000000-0000-4000-8000-000000000002'
export function planLine(
  overrides: Partial<TransferPutAwayPlanLine> = {}
): TransferPutAwayPlanLine {
  return {
    slotId: SLOT_A,
    slotCode: 'A01',
    rackCode: 'A',
    zoneName: 'Khu A',
    path: 'Khu A / Kệ A / A01',
    plannedTotal: 6,
    receivedQuantity: 2,
    remainingBudget: 4,
    isSystemDefaultSlot: false,
    plannedByUserId: 'u1',
    createdAt: '2026-10-12T00:00:00Z',
    modifiedAt: null,
    ...overrides,
  }
}
export function plannedReceiveSheet(
  overrides: Partial<TransferReceiveSheet> = {}
): TransferReceiveSheet {
  return {
    shipmentId: '50000000-0000-4000-8000-000000000001',
    shipmentNumber: 1,
    transferId: '60000000-0000-4000-8000-000000000001',
    transferCode: 'DC-01',
    destinationWarehouseId: '70000000-0000-4000-8000-000000000002',
    destinationWarehouseName: 'Kho B',
    shipmentStatus: 'InTransit',
    version: 'v1',
    planVersion: 'hash1',
    lines: [
      {
        lineId: LINE_ID,
        itemId: buildTransferItem().id,
        productId: buildTransferItem().productId,
        sku: 'SKU-001',
        productName: 'Sữa tươi',
        productBarcode: null,
        baseUnitName: 'Hộp',
        suggestedSlotId: null,
        suggestedSlotCode: null,
        suggestedRackCode: null,
        suggestedIsSystemDefaultSlot: false,
        planMode: 'Planned',
        lots: [
          {
            lotId: null,
            lotNumber: null,
            expiryDate: null,
            dispatchedQuantity: 6,
            receivedQuantity: 0,
            unplannedQuantity: 2,
            plan: [
              {
                slotId: SLOT_A,
                slotCode: 'A01',
                rackCode: 'A',
                zoneName: 'A',
                path: 'Khu A / A01',
                plannedQuantity: 4,
                remainingBudget: 4,
                isSystemDefaultSlot: false,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}
