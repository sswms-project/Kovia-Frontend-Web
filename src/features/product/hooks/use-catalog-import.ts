import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import type { SpreadsheetImportOptions } from '@/components/operations/spreadsheet-import.types'
import { catalogImportService } from '../services/catalog-import.service'
import type { CatalogImportItem, CatalogImportKind } from '../types/catalog-import.types'

export function useCatalogImport(kind: CatalogImportKind) {
  const client = useQueryClient()
  const inspect = useMutation({
    mutationFn: ({ file, delimiter }: { file: File; delimiter: string }) =>
      catalogImportService.inspect(kind, file, delimiter),
    onError: logger.error,
  })
  const preview = useMutation({
    mutationFn: ({
      file,
      options,
      codeOverrides,
    }: {
      file: File
      options: SpreadsheetImportOptions
      codeOverrides?: readonly { rowNumber: number; code: string }[]
    }) => catalogImportService.preview(kind, file, options, codeOverrides),
    onError: logger.error,
  })
  const template = useMutation<Blob, Error, void>({
    mutationFn: () => catalogImportService.template(kind),
    onError: logger.error,
  })
  const commit = useMutation({
    mutationFn: (items: readonly CatalogImportItem[]) => catalogImportService.commit(kind, items),
    retry: false,
    onError: logger.error,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [kind] })
    },
  })
  return { inspect, preview, template, commit }
}
