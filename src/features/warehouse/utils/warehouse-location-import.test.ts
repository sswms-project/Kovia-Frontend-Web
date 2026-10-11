import { describe, expect, it } from 'vitest'
import {
  initialLocationImportOptions,
  locationImportReport,
  missingLocationImportParents,
} from './warehouse-location-import'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportRow,
} from '../types/warehouse-location-import.types'

export const locationRow = (
  rowKey: string,
  kind: WarehouseLocationImportRow['kind'],
  parents: string[] = []
): WarehouseLocationImportRow => ({
  rowKey,
  kind,
  source: { sheetId: kind, sheetName: kind === 'Zone' ? 'Khu vực' : 'Kệ', rowNumber: 2 },
  action: 'Create',
  canSelect: true,
  displayPath: rowKey,
  values: { zoneCode: 'Z', zoneName: 'Khu mới', rackCode: 'R', rackName: 'Kệ mới' },
  sourceValues: {},
  requiredParentRowKeys: parents,
  issues: [],
  fieldErrors: {},
})

describe('warehouse location import state helpers', () => {
  it('does not guess between equally ranked sheets or reuse one sheet', () => {
    const sheet = (sheetId: string) => ({
      sheetId,
      sheetName: sheetId,
      sampleRows: [],
      headerCandidates: [
        {
          rowNumber: 1,
          hasAllRequiredFields: true,
          columns: [],
          suggestedMapping: [{ field: 'zoneCode', columnIndex: 0 }],
        },
      ],
    })
    const inspection: WarehouseLocationImportInspection = {
      mode: 'Structure',
      isCsv: false,
      csvDelimiter: null,
      schemaVersion: 1,
      fieldsByKind: {},
      sheetsByKind: { Zone: [sheet('1'), sheet('2')], Rack: [sheet('3')], Slot: [sheet('3')] },
    }
    const options = initialLocationImportOptions(inspection, 'auto')
    expect(options.tables.map((table) => table.kind)).toEqual(['Rack'])
  })
  it('preserves selected children and reports their missing ancestors', () => {
    expect(
      missingLocationImportParents(
        [locationRow('z', 'Zone'), locationRow('r', 'Rack', ['z'])],
        new Set(['r'])
      )
    ).toEqual(['z'])
  })
  it('exports every source row with formula-safe raw values and result labels', () => {
    const row = {
      ...locationRow('=Z', 'Zone'),
      source: { sheetId: '1', sheetName: '=HYPERLINK("x")', rowNumber: 8 },
    }
    const csv = locationImportReport({ rows: [row] }, new Set())
    expect(csv).toContain("'=")
    expect(csv).toContain('Không nhập')
    expect(csv).toContain('8')
  })
})
