import { describe, expect, it } from 'vitest'
import {
  createShipmentSchema,
  transferFeedbackSchema,
  transferReasonSchema,
} from './transfer-actions.schema'
import {
  createTransferReceiptSchema,
  receiptEntryKey,
  transferDiscrepancySchema,
  transferPickEscalateSchema,
  transferPickSwitchSchema,
} from './transfer-fulfillment.schema'
import { transferRequestSchema, transferRequestSchemaWithLocks } from './transfer-request.schema'

const SOURCE = '70000000-0000-4000-8000-000000000001'
const DESTINATION = '70000000-0000-4000-8000-000000000002'
const PRODUCT_A = '30000000-0000-4000-8000-000000000001'
const PRODUCT_B = '30000000-0000-4000-8000-000000000002'
const ITEM_A = '20000000-0000-4000-8000-000000000001'

const validRequest = {
  transferCode: '',
  requesterName: '',
  requestingDepartment: '',
  sourceWarehouseId: SOURCE,
  destinationWarehouseId: DESTINATION,
  reason: '',
  requiredBy: '',
  note: '',
  lines: [
    {
      itemId: null,
      productId: PRODUCT_A,
      unitId: '',
      destinationSlotId: '',
      sourceSlotId: '',
      quantity: 5,
    },
  ],
}

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? []
}

describe('transferRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(transferRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('limits the code, requester and department lengths like the backend', () => {
    const result = transferRequestSchema.safeParse({
      ...validRequest,
      transferCode: 'X'.repeat(101),
      requesterName: 'X'.repeat(201),
      requestingDepartment: 'X'.repeat(201),
    })
    expect(issuePaths(result)).toEqual(
      expect.arrayContaining(['transferCode', 'requesterName', 'requestingDepartment'])
    )
  })

  it('requires different warehouses', () => {
    const result = transferRequestSchema.safeParse({
      ...validRequest,
      destinationWarehouseId: SOURCE,
    })
    expect(issuePaths(result)).toContain('destinationWarehouseId')
  })

  it('rejects duplicate products, empty lines and non-positive quantities', () => {
    const duplicate = transferRequestSchema.safeParse({
      ...validRequest,
      lines: [validRequest.lines[0], { ...validRequest.lines[0] }],
    })
    expect(issuePaths(duplicate)).toContain('lines.1.productId')
    expect(transferRequestSchema.safeParse({ ...validRequest, lines: [] }).success).toBe(false)
    expect(
      issuePaths(
        transferRequestSchema.safeParse({
          ...validRequest,
          lines: [{ ...validRequest.lines[0], quantity: 0 }],
        })
      )
    ).toContain('lines.0.quantity')
    expect(
      transferRequestSchema.safeParse({
        ...validRequest,
        lines: [{ ...validRequest.lines[0], quantity: Number.NaN }],
      }).success
    ).toBe(false)
  })

  it('mirrors the backend length limits', () => {
    expect(
      issuePaths(transferRequestSchema.safeParse({ ...validRequest, reason: 'a'.repeat(501) }))
    ).toContain('reason')
    expect(
      issuePaths(transferRequestSchema.safeParse({ ...validRequest, note: 'a'.repeat(1001) }))
    ).toContain('note')
    const tooMany = Array.from({ length: 201 }, (_, index) => ({
      itemId: null,
      productId: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      unitId: '',
      destinationSlotId: '',
      sourceSlotId: '',
      quantity: 1,
    }))
    expect(transferRequestSchema.safeParse({ ...validRequest, lines: tooMany }).success).toBe(false)
  })

  it('does not let a line drop below the quantity that already left the warehouse', () => {
    const schema = transferRequestSchemaWithLocks(new Map([[ITEM_A, { minimum: 4 }]]))
    const edited = {
      ...validRequest,
      lines: [
        {
          itemId: ITEM_A,
          productId: PRODUCT_A,
          unitId: '',
          destinationSlotId: '',
          sourceSlotId: '',
          quantity: 3,
        },
      ],
    }
    expect(issuePaths(schema.safeParse(edited))).toContain('lines.0.quantity')
    expect(
      schema.safeParse({ ...edited, lines: [{ ...edited.lines[0], quantity: 4 }] }).success
    ).toBe(true)
    const added = {
      ...edited,
      lines: [
        {
          itemId: null,
          productId: PRODUCT_B,
          unitId: '',
          destinationSlotId: '',
          sourceSlotId: '',
          quantity: 1,
        },
      ],
    }
    expect(schema.safeParse(added).success).toBe(true)
  })
})

describe('action schemas', () => {
  it('requires a trimmed reason of at most 500 characters', () => {
    expect(transferReasonSchema.safeParse({ reason: '   ' }).success).toBe(false)
    expect(transferReasonSchema.safeParse({ reason: 'a'.repeat(501) }).success).toBe(false)
    expect(transferReasonSchema.safeParse({ reason: 'Đổi kế hoạch' }).success).toBe(true)
  })

  it('validates feedback reason and message', () => {
    const base = { reasonCode: 'InsufficientStock', itemId: '', message: 'Kệ A đã hết hàng' }
    expect(transferFeedbackSchema.safeParse(base).success).toBe(true)
    expect(transferFeedbackSchema.safeParse({ ...base, reasonCode: 'Nope' }).success).toBe(false)
    expect(transferFeedbackSchema.safeParse({ ...base, message: ' ' }).success).toBe(false)
  })

  it('requires a positive quantity within what is still unbatched for each selected line', () => {
    const line = {
      itemId: ITEM_A,
      label: 'SKU-001',
      unitName: 'Hộp',
      selected: true,
      maximum: 6,
      quantity: 4,
    }
    expect(createShipmentSchema.safeParse({ lines: [line] }).success).toBe(true)
    expect(createShipmentSchema.safeParse({ lines: [{ ...line, selected: false }] }).success).toBe(
      false
    )
    expect(
      issuePaths(createShipmentSchema.safeParse({ lines: [{ ...line, quantity: 7 }] }))
    ).toContain('lines.0.quantity')
    expect(
      issuePaths(createShipmentSchema.safeParse({ lines: [{ ...line, quantity: 0 }] }))
    ).toContain('lines.0.quantity')
    expect(
      createShipmentSchema.safeParse({ lines: [{ ...line, selected: false, quantity: 99 }, line] })
        .success
    ).toBe(true)
  })
})

describe('pick schemas', () => {
  const stock = '80000000-0000-4000-8000-000000000001'

  it('requires a note when switching for a reason of Other', () => {
    const base = { toInventoryStockId: stock, quantity: 2, reasonCode: 'Other', note: '' }
    expect(issuePaths(transferPickSwitchSchema.safeParse(base))).toContain('note')
    expect(transferPickSwitchSchema.safeParse({ ...base, note: 'Pallet chắn lối' }).success).toBe(
      true
    )
    expect(transferPickSwitchSchema.safeParse({ ...base, reasonCode: 'Damaged' }).success).toBe(
      true
    )
    expect(
      transferPickSwitchSchema.safeParse({ ...base, reasonCode: 'Damaged', quantity: 1.234 })
        .success
    ).toBe(false)
  })

  it('requires a description when escalating to the manager', () => {
    expect(transferPickEscalateSchema.safeParse({ reasonCode: 'NotFound', note: '' }).success).toBe(
      false
    )
    expect(
      transferPickEscalateSchema.safeParse({ reasonCode: 'NotFound', note: 'Không thấy hàng' })
        .success
    ).toBe(true)
  })
})

describe('createTransferReceiptSchema', () => {
  const LINE = '90000000-0000-4000-8000-000000000001'
  const SLOT = 'a0000000-0000-4000-8000-000000000001'
  const expected = new Map([[receiptEntryKey(LINE, null), 10]])
  const schema = createTransferReceiptSchema(expected)
  const entry = {
    lineId: LINE,
    lotId: null,
    productLabel: 'SKU-001',
    destinationSlotId: SLOT,
    scannedSlotCode: 'B-01',
    scannedProductCode: '',
    goodQuantity: 10,
    damagedQuantity: 0,
    missingQuantity: 0,
    reasonCode: '',
    note: '',
  }

  it('accepts a full good receipt', () => {
    expect(schema.safeParse({ entries: [entry] }).success).toBe(true)
  })

  it('requires the declared total to equal the dispatched quantity', () => {
    expect(issuePaths(schema.safeParse({ entries: [{ ...entry, goodQuantity: 9 }] }))).toContain(
      'entries.0.goodQuantity'
    )
  })

  it('requires a reason for damaged or missing goods', () => {
    const withProblem = { ...entry, goodQuantity: 7, damagedQuantity: 2, missingQuantity: 1 }
    expect(issuePaths(schema.safeParse({ entries: [withProblem] }))).toContain(
      'entries.0.reasonCode'
    )
    expect(
      schema.safeParse({ entries: [{ ...withProblem, reasonCode: 'TransitDamage' }] }).success
    ).toBe(true)
  })

  it('requires a destination slot only when something is put away', () => {
    const allMissing = {
      ...entry,
      goodQuantity: 0,
      missingQuantity: 10,
      reasonCode: 'Lost',
      destinationSlotId: '',
      scannedSlotCode: '',
    }
    expect(schema.safeParse({ entries: [allMissing] }).success).toBe(true)
    expect(
      issuePaths(schema.safeParse({ entries: [{ ...entry, destinationSlotId: '' }] }))
    ).toContain('entries.0.scannedSlotCode')
  })

  it('lets one line be split across several slots as long as the total matches', () => {
    const split = [
      { ...entry, goodQuantity: 6 },
      { ...entry, goodQuantity: 4, scannedSlotCode: 'B-02' },
    ]
    expect(schema.safeParse({ entries: split }).success).toBe(true)
  })
})

describe('transferDiscrepancySchema', () => {
  const base = {
    action: 'ConfirmLoss',
    quantity: 2,
    lotId: '',
    destinationSlotId: '',
    scannedSlotCode: '',
    note: '',
  }

  it('requires a note for loss confirmation and damage hand-over', () => {
    expect(issuePaths(transferDiscrepancySchema.safeParse(base))).toContain('note')
    expect(transferDiscrepancySchema.safeParse({ ...base, note: 'Biên bản số 12' }).success).toBe(
      true
    )
    expect(
      issuePaths(transferDiscrepancySchema.safeParse({ ...base, action: 'AcknowledgeDamage' }))
    ).toContain('note')
  })

  it('requires a scanned destination slot for a late receipt', () => {
    const late = { ...base, action: 'LateReceipt' }
    expect(issuePaths(transferDiscrepancySchema.safeParse(late))).toContain('scannedSlotCode')
    expect(
      transferDiscrepancySchema.safeParse({
        ...late,
        scannedSlotCode: 'B-01',
      }).success
    ).toBe(true)
  })
})
