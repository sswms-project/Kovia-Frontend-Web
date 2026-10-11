import { describe, expect, it } from 'vitest'
import {
  initialSpreadsheetMapping,
  mappingForSheet,
  spreadsheetIgnoredData,
  spreadsheetMappingError,
} from './spreadsheet-import'
import type { SpreadsheetImportInspection } from './spreadsheet-import.types'

const inspection: SpreadsheetImportInspection = {
  schemaVersion: 1,
  isCsv: true,
  csvDelimiter: ';',
  fields: [{ field: 'name', displayName: 'Tên', isRequired: true, description: '', aliases: [] }],
  sheets: [
    {
      sheetId: 'csv',
      sheetName: 'CSV',
      sampleRows: [],
      headerCandidates: [
        {
          rowNumber: 3,
          hasAllRequiredFields: true,
          suggestedMapping: [{ field: 'name', columnIndex: 1 }],
          columns: [
            { columnIndex: 1, letter: 'B', header: 'Tên' },
            { columnIndex: 2, letter: 'C', header: 'Ghi chú' },
          ],
        },
      ],
    },
  ],
}

describe('shared spreadsheet mapping', () => {
  it('uses the only complete header and server delimiter', () => {
    const options = initialSpreadsheetMapping(inspection)
    expect(options).toMatchObject({ sheetId: 'csv', headerRowNumber: 3, csvDelimiter: ';' })
    expect(spreadsheetMappingError(inspection, options)).toBeUndefined()
  })
  it('does not guess between ambiguous sheets or headers', () => {
    const ambiguous = {
      ...inspection,
      sheets: [...inspection.sheets, { ...inspection.sheets[0]!, sheetId: '2' }],
    }
    expect(initialSpreadsheetMapping(ambiguous).sheetId).toBe('')
    const sheet = {
      ...inspection.sheets[0]!,
      headerCandidates: [
        ...inspection.sheets[0]!.headerCandidates,
        { ...inspection.sheets[0]!.headerCandidates[0]!, rowNumber: 4 },
      ],
    }
    expect(mappingForSheet(initialSpreadsheetMapping(inspection), sheet).headerRowNumber).toBe(0)
  })
  it('rejects required omissions, duplicate columns and absent indexes', () => {
    const options = initialSpreadsheetMapping(inspection)
    expect(spreadsheetMappingError(inspection, { ...options, columnMapping: [] })).toContain(
      'bắt buộc'
    )
    expect(
      spreadsheetMappingError(inspection, {
        ...options,
        columnMapping: [...options.columnMapping, { field: 'other', columnIndex: 1 }],
      })
    ).toContain('nhiều trường')
    expect(
      spreadsheetMappingError(inspection, {
        ...options,
        columnMapping: [{ field: 'name', columnIndex: 99 }],
      })
    ).toContain('không hợp lệ')
  })
  it('lists the precise ignored columns and sheets', () => {
    const ignored = spreadsheetIgnoredData(
      {
        ...inspection,
        sheets: [
          ...inspection.sheets,
          { ...inspection.sheets[0]!, sheetId: 'guide', sheetName: 'Hướng dẫn' },
        ],
      },
      initialSpreadsheetMapping(inspection)
    )
    expect(ignored.sheets).toEqual(['Hướng dẫn'])
    expect(ignored.columns.map((column) => column.letter)).toEqual(['C'])
  })
})
