import { requestExcelFile } from '@/lib/excel-export-request'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import {
  inventoryExportSchema,
  type InventoryExportQuery,
} from '../schemas/inventory-export.schema'

export const inventoryExportService = {
  exportExcel: (filters: InventoryExportQuery, signal: AbortSignal) =>
    requestExcelFile(
      API_ENDPOINTS.inventory.exportExcel,
      inventoryExportSchema.parse(filters),
      signal
    ),
}
