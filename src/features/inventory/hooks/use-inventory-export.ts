'use client'

import { useExcelDownload } from '@/hooks/use-excel-download'
import { inventoryExportService } from '../services/inventory-export.service'

export function useInventoryExport(enabled: boolean) {
  return useExcelDownload(
    enabled,
    inventoryExportService.exportExcel,
    'Đã xuất Tồn kho khả dụng theo bộ lọc lúc bắt đầu xuất.'
  )
}
