import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import type {
  WarehouseLocationImportMode,
  WarehouseLocationImportOptions,
  WarehouseLocationImportSelection,
} from '../schemas/warehouse-location-import.schema'
import { warehouseLocationImportService as service } from '../services/warehouse-location-import.service'

export function useWarehouseLocationImport(warehouseId: string) {
  const client = useQueryClient()
  const inspect = useMutation({
    mutationFn: ({
      file,
      mode,
      delimiter,
    }: {
      file: File
      mode: WarehouseLocationImportMode
      delimiter: string
    }) => service.inspect(warehouseId, file, mode, delimiter),
    retry: false,
  })
  const preview = useMutation({
    mutationFn: ({ file, options }: { file: File; options: WarehouseLocationImportOptions }) =>
      service.preview(warehouseId, file, options),
    retry: false,
  })
  const template = useMutation({
    mutationFn: (mode: WarehouseLocationImportMode) => service.template(warehouseId, mode),
    retry: false,
  })
  const commit = useMutation({
    mutationFn: ({
      file,
      options,
      selection,
    }: {
      file: File
      options: WarehouseLocationImportOptions
      selection: WarehouseLocationImportSelection
    }) => service.commit(warehouseId, file, options, selection),
    retry: false,
    onSuccess: async () => {
      // This prefix covers detail, layout, layoutScene and every locations query.
      // Refresh failure must never turn a confirmed commit into a retryable import error.
      try {
        await client.invalidateQueries(
          { queryKey: queryKeys.warehouses.detail(warehouseId) },
          { throwOnError: true }
        )
      } catch {
        toast.warning(
          'Đã nhập dữ liệu nhưng chưa làm mới danh mục. Hãy tải lại danh mục hoặc sơ đồ.'
        )
      }
    },
  })
  return { inspect, preview, template, commit }
}
