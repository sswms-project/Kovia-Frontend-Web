import { requestExcelFile } from '@/lib/excel-export-request'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { listExportSchema, type ListExportRequest } from '../schemas/list-export.schema'

export const listExportService = {
  exportExcel: (request: ListExportRequest, signal: AbortSignal) =>
    requestExcelFile(API_ENDPOINTS.listExports, listExportSchema.parse(request), signal),
}
