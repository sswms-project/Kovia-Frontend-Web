import { describe, expect, it } from 'vitest'
import {
  warehouseLocationImportOptionsSchema,
  warehouseLocationImportSelectionSchema,
} from './warehouse-location-import.schema'

const zone = {
  kind: 'Zone',
  sheetId: '1',
  headerRowNumber: 1,
  columnMapping: [{ field: 'zoneCode', columnIndex: 0 }],
}
const rack = {
  kind: 'Rack',
  sheetId: '2',
  headerRowNumber: 1,
  columnMapping: [
    { field: 'zoneCode', columnIndex: 0 },
    { field: 'rackCode', columnIndex: 1 },
  ],
}
const options = { schemaVersion: 1, mode: 'Structure', csvDelimiter: 'auto', tables: [zone, rack] }

describe('warehouse location import contracts', () => {
  it('accepts a reference-only parent table without requiring name or storage mode mappings', () => {
    expect(warehouseLocationImportOptionsSchema.safeParse(options).success).toBe(true)
  })
  it('rejects a sheet used for two kinds', () => {
    expect(
      warehouseLocationImportOptionsSchema.safeParse({
        ...options,
        tables: [zone, { ...rack, sheetId: zone.sheetId }],
      }).success
    ).toBe(false)
  })
  it('requires all path-code columns for slots', () => {
    expect(
      warehouseLocationImportOptionsSchema.safeParse({
        ...options,
        mode: 'Slots',
        tables: [{ ...zone, kind: 'Slot' }],
      }).success
    ).toBe(false)
  })
  it('rejects duplicated fields, duplicated source columns, invalid header and a wrong single-table mode', () => {
    for (const tables of [
      [
        {
          ...zone,
          columnMapping: [
            { field: 'zoneCode', columnIndex: 0 },
            { field: 'zoneCode', columnIndex: 1 },
          ],
        },
      ],
      [
        {
          ...zone,
          columnMapping: [
            { field: 'zoneCode', columnIndex: 0 },
            { field: 'zoneName', columnIndex: 0 },
          ],
        },
      ],
      [{ ...zone, headerRowNumber: 51 }],
      [rack],
    ])
      expect(
        warehouseLocationImportOptionsSchema.safeParse({ ...options, mode: 'Zones', tables })
          .success
      ).toBe(false)
  })
  it('requires a nonempty unique selection and bounds its size', () => {
    const selection = {
      expectedPreviewFingerprint: 'sha256:preview',
      acknowledgeIgnoredData: false,
      selectedRowKeys: ['["Zone","1",2]'],
    }
    expect(warehouseLocationImportSelectionSchema.safeParse(selection).success).toBe(true)
    expect(
      warehouseLocationImportSelectionSchema.safeParse({ ...selection, selectedRowKeys: [] })
        .success
    ).toBe(false)
    expect(
      warehouseLocationImportSelectionSchema.safeParse({
        ...selection,
        selectedRowKeys: ['same', 'same'],
      }).success
    ).toBe(false)
    expect(
      warehouseLocationImportSelectionSchema.safeParse({
        ...selection,
        selectedRowKeys: Array.from({ length: 501 }, (_, index) => String(index)),
      }).success
    ).toBe(false)
  })
})
