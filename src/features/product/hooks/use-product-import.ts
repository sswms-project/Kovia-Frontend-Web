import { useMutation, useQuery } from '@tanstack/react-query'
import { productImportService } from '../services/product-import.service'
import type { ProductImportOptions } from '../types/product-import.types'
import type { ApiErrorResponse } from '@/types/api'
import { logger } from '@/lib/logger'
import { formatApiError } from '@/lib/api-error'

export function useProductImportInspect(
  sessionId: string,
  file: File | null,
  delimiter: ProductImportOptions['csvDelimiter']
) {
  return useQuery({
    queryKey: ['product-import', sessionId, 'inspect', delimiter],
    queryFn: ({ signal }) => {
      if (!file) throw new Error('Chọn tệp.')
      return productImportService.inspect(file, delimiter, signal)
    },
    enabled: Boolean(file),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useProductImportPreview(
  sessionId: string,
  revision: number,
  file: File | null,
  options: ProductImportOptions | null
) {
  return useQuery({
    queryKey: ['product-import', sessionId, 'preview', revision, options],
    queryFn: ({ signal }) => {
      if (!file || !options) throw new Error('Kiểm tra cấu hình.')
      return productImportService.preview(file, options, signal)
    },
    enabled: Boolean(file && options),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useProductImportTemplate() {
  return useMutation<Blob, ApiErrorResponse, 'basic' | 'full'>({
    mutationFn: productImportService.template,
    retry: false,
    gcTime: 0,
    onError: (error) => logger.warn(formatApiError(error)),
  })
}
