import { describe, expect, it } from 'vitest'
import { inboundRequestSchema } from './inbound-request.schema'

const GUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

const validValues = {
  inboundRequestCode: 'IR000001',
  warehouseId: GUID,
  receivingAssignedTo: '',
  sourceType: 'Supplier' as const,
  supplierId: GUID,
  sourceName: '',
  sourceReference: '',
  expectedDate: '2026-10-20',
  lines: [{ productId: GUID, quantity: 5, unitId: '' }],
}

describe('inboundRequestSchema expected date', () => {
  it('accepts a request that carries an expected date', () => {
    expect(inboundRequestSchema.safeParse(validValues).success).toBe(true)
  })

  it('refuses a request without one, with a message the form can show', () => {
    const result = inboundRequestSchema.safeParse({ ...validValues, expectedDate: '' })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['expectedDate'],
        message: 'Vui lòng chọn ngày dự kiến hàng về.',
      })
    )
  })
})
