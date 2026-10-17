import { describe, expect, it } from 'vitest'
import { openingStockImportSetupSchema } from './opening-stock-import.schema'

describe('opening stock import warehouse validation', () => {
  const setup = { warehouseId: '757b5d63-38a8-4d3c-363d-08df1fc89199', effectiveDate: '2026-01-01' }

  it('accepts a non-RFC .NET warehouse GUID without rewriting the identifier', () => {
    expect(openingStockImportSetupSchema.safeParse(setup)).toMatchObject({
      success: true,
      data: setup,
    })
  })

  it.each(['', 'DN-01', '00000000-0000-0000-0000-000000000000'])(
    'rejects a missing or invalid warehouse: %s',
    (warehouseId) => {
      expect(openingStockImportSetupSchema.safeParse({ ...setup, warehouseId }).success).toBe(false)
    }
  )
})
