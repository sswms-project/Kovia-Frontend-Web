import { describe, expect, it } from 'vitest'
import { goodsReceiptSchema } from './inbound.schema'
import { receiptDamageIsolationSchema } from './receipt-damage-isolation.schema'

const receipt = {
  inboundRequestId: '10000000-0000-4000-8000-000000000001',
  receiptCode: 'DN-PN000001',
  lines: [
    {
      inboundRequestItemId: '10000000-0000-4000-8000-000000000002',
      receivedQty: 4,
      damagedQty: 0,
      exceptionReason: '',
      isLotTracked: false,
      lotNumber: '',
      manufacturedDate: '',
      expiryDate: '',
    },
  ],
}

describe('manual goods receipt code', () => {
  it('normalizes the same way as the backend', () => {
    expect(goodsReceiptSchema.parse({ ...receipt, receiptCode: ' dn-pn000001 ' }).receiptCode).toBe(
      'DN-PN000001'
    )
  })
  it.each(['', '   ', 'A'.repeat(101)])('rejects an empty or oversized code', (receiptCode) => {
    const result = goodsReceiptSchema.safeParse({ ...receipt, receiptCode })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['receiptCode'])
  })
  it('accepts the existing backend column limit', () => {
    expect(goodsReceiptSchema.safeParse({ ...receipt, receiptCode: 'A'.repeat(100) }).success).toBe(
      true
    )
  })
})

describe('damage isolation scan contract', () => {
  const isolation = {
    goodsReceiptItemId: '10000000-0000-4000-8000-000000000002',
    quantity: 1,
    physicallySeparated: true,
  }
  it.each([
    `${'Z'.repeat(50)}-${'R'.repeat(50)}-${'S'.repeat(50)}`,
    'KOVIA:LOC:SLOT:10000000-0000-4000-8000-000000000003',
    'KOVIA:LOC:RACK:10000000-0000-4000-8000-000000000004',
    '9'.repeat(255),
  ])('preserves a valid printed label or barcode for backend verification', (code) => {
    expect(
      receiptDamageIsolationSchema.parse({ ...isolation, confirmedSlotCode: ` ${code} ` })
        .confirmedSlotCode
    ).toBe(code)
  })
  it.each(['', '   ', 'X'.repeat(256)])('rejects empty or oversized input', (code) => {
    const result = receiptDamageIsolationSchema.safeParse({ ...isolation, confirmedSlotCode: code })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['confirmedSlotCode'])
  })
})
