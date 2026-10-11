import { axiosClient } from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportOptions,
} from '@/components/operations/spreadsheet-import.types'
import type {
  CatalogImportItem,
  CatalogImportKind,
  CatalogImportRow,
} from '../types/catalog-import.types'

export const catalogImportService = {
  inspect: (kind: CatalogImportKind, file: File, csvDelimiter: string) => {
    const data = new FormData()
    data.append('file', file)
    data.append('csvDelimiter', csvDelimiter)
    return axiosClient
      .post<ApiResponse<SpreadsheetImportInspection>>(`/${kind}/import/inspect`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },
  preview: (
    kind: CatalogImportKind,
    file: File,
    options: SpreadsheetImportOptions,
    codeOverrides: readonly { rowNumber: number; code: string }[] = []
  ) => {
    const data = new FormData()
    data.append('file', file)
    data.append('options', JSON.stringify(options))
    data.append('codeOverrides', JSON.stringify(codeOverrides))
    return axiosClient
      .post<ApiResponse<{ rows: CatalogImportRow[] }>>(`/${kind}/import/preview`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },
  commit: (kind: CatalogImportKind, items: readonly CatalogImportItem[]) =>
    axiosClient.post(`/${kind}/import`, { items }),
  template: (kind: CatalogImportKind) =>
    axiosClient
      .get<Blob>(`/${kind}/import/template`, { responseType: 'blob' })
      .then((response) => response.data),
}
