import { describe, expect, it } from 'vitest'
import { productImportCatalogSchema } from './product-import-catalog.schema'

const entry = {
  id: '84ec110f-ff70-489e-a407-ce1493899522',
  categories: false,
  value: 'Lon',
  rowNumber: 2,
  canCreate: true,
  mode: 'skip' as const,
  existingId: '',
  code: 'DVT-LON',
  name: 'Lon',
  parentCode: '',
  symbol: '',
  quantityPrecision: 0,
}

describe('quick setup catalog form limits', () => {
  it('accepts all 500 category and 2500 unit references allowed by the API', () => {
    expect(
      productImportCatalogSchema.safeParse({
        confirmed: false,
        entries: Array.from({ length: 3000 }, (_, index) => ({
          ...entry,
          categories: index < 500,
          value: `Danh mục ${index}`,
        })),
      }).success
    ).toBe(true)
  })
  it('rejects references over the API limit', () => {
    const parsed = productImportCatalogSchema.safeParse({
      confirmed: false,
      entries: Array.from({ length: 3001 }, () => entry),
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toContain('3.000')
  })
  it.each([NaN, -1, 7, 1.5])('reports precision %s in Vietnamese', (quantityPrecision) => {
    const parsed = productImportCatalogSchema.safeParse({
      confirmed: false,
      entries: [{ ...entry, quantityPrecision }],
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toMatch(/Nhập|Số chữ số/)
  })
})
