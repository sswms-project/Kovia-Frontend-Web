import { describe, expect, it } from 'vitest'
import { createOpeningStockSchema } from './create-opening-stock.schema'

const file = new File(['evidence'], 'count-sheet.pdf', { type: 'application/pdf' })
const base = {
  code: 'TDK-0001',
  warehouseId: '89e756b0-a22f-4c14-8f3a-5c480a1bf642',
  effectiveDate: '2026-01-01',
  newLotNumber: '',
  manufacturedDate: '',
  expiryDate: '',
  acknowledgePendingLots: false,
  evidenceFile: file,
  productId: '1f9d96cb-76bc-47b4-93bc-18a1dfeeea65',
  slotId: 'fe89a609-433b-416c-87a5-5854e12b2b8a',
  lotId: '',
  quantity: 5,
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
} as const

describe('createOpeningStockSchema', () => {
  it('requires a manually entered code and rejects overlong or control-character codes', () => {
    for (const code of ['', '  ', 'TDK\n01', 'A'.repeat(101)]) {
      expect(createOpeningStockSchema.safeParse({ ...base, code }).success).toBe(false)
    }
    const result = createOpeningStockSchema.parse({ ...base, code: '  TDK-0002  ' })
    expect(result.code).toBe('TDK-0002')
  })
  it('accepts non-RFC .NET GUID identifiers returned by the API without changing them', () => {
    const guid = '757b5d63-38a8-4d3c-363d-08df1fc89199'
    const result = createOpeningStockSchema.safeParse({
      ...base,
      warehouseId: guid,
      productId: guid,
      slotId: guid,
      lotId: guid,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.warehouseId).toBe(guid)
  })
  it.each(['warehouseId', 'productId', 'slotId', 'lotId'])(
    'still rejects malformed and empty GUIDs for %s',
    (field) => {
      for (const value of ['not-an-id', '00000000-0000-0000-0000-000000000000']) {
        expect(createOpeningStockSchema.safeParse({ ...base, [field]: value }).success).toBe(false)
      }
    }
  )
  it('accepts manual entry without an attachment and still rejects an invalid file value', () => {
    expect(createOpeningStockSchema.safeParse({ ...base, evidenceFile: undefined }).success).toBe(
      true
    )
    expect(
      createOpeningStockSchema.safeParse({ ...base, evidenceFile: 'not-a-file' }).success
    ).toBe(false)
  })
  it('requires confirmation for a pending lot', () => {
    expect(createOpeningStockSchema.safeParse({ ...base, newLotNumber: 'L-01' }).success).toBe(
      false
    )
    expect(
      createOpeningStockSchema.safeParse({
        ...base,
        newLotNumber: 'L-01',
        acknowledgePendingLots: true,
      }).success
    ).toBe(true)
  })
  it('does not accept manufacture after the effective date', () => {
    expect(
      createOpeningStockSchema.safeParse({ ...base, manufacturedDate: '2026-01-02' }).success
    ).toBe(false)
  })
  it('rejects a damaged line outside damage hold', () => {
    const result = createOpeningStockSchema.safeParse({
      ...base,
      qualityStatus: 'Damaged',
      eligibilityStatus: 'Available',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a damaged line held for damage', () => {
    expect(
      createOpeningStockSchema.safeParse({
        ...base,
        qualityStatus: 'Damaged',
        eligibilityStatus: 'DamageHold',
      }).success
    ).toBe(true)
  })
})
