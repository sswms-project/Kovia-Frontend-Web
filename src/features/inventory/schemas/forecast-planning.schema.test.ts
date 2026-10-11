import { describe, expect, it } from 'vitest'
import { createForecastRunSchema, reviewReplenishmentSchema } from './forecast-planning.schema'

// GUID returned by the live warehouse dropdown; .NET GUIDs need not have an RFC UUID variant.
const warehouseId = '757b5d63-38a8-4d3c-363d-08df1fc89199'
const forecast = { warehouseId, historicalPeriodDays: 90, horizonDays: 14 }
const review = { supplierId: warehouseId, adjustedQuantity: 12, adjustmentReason: '' }

describe('forecast planning GUID compatibility', () => {
  it('accepts the GUID returned by the warehouse API', () => {
    expect(createForecastRunSchema.safeParse(forecast).success).toBe(true)
  })

  it('accepts non-RFC .NET GUIDs for supplier selection', () => {
    expect(reviewReplenishmentSchema.safeParse(review).success).toBe(true)
  })

  it.each(['', '00000000-0000-0000-0000-000000000000', 'not-a-guid'])(
    'rejects invalid or empty selections: %s',
    (id) => {
      expect(createForecastRunSchema.safeParse({ ...forecast, warehouseId: id }).success).toBe(
        false
      )
      expect(reviewReplenishmentSchema.safeParse({ ...review, supplierId: id }).success).toBe(false)
    }
  )

  it('retains the forecast period and positive quantity constraints', () => {
    expect(
      createForecastRunSchema.safeParse({ ...forecast, historicalPeriodDays: 0 }).success
    ).toBe(false)
    expect(createForecastRunSchema.safeParse({ ...forecast, horizonDays: 91 }).success).toBe(false)
    expect(reviewReplenishmentSchema.safeParse({ ...review, adjustedQuantity: 0 }).success).toBe(
      false
    )
  })
})
