import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import {
  RECORD_STATUS,
  type ProductOption,
} from '@/features/inbound-request/types/inbound-request.types'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import { productService } from '@/features/product/services/product.service'
import { logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { AiFormProductSnapshot } from '../schemas/ai-form-card.schema'
import { toAiCatalogProduct } from '../utils/ai-catalog-product'
import { toLookup, useSearchTerm } from './use-ai-form-lookups'

const LOOKUP_PAGE_SIZE = 20
const CONVERSIONS_STALE_MS = 5 * 60 * 1000

/**
 * Active products matching `searchText`, with or without stock (the inbound request's own search),
 * and what a picked one needs to become a row: its base unit at once, its other units once loaded.
 * `products` holds the full records behind `options`.
 */
export function useAiCatalogProductLookup(searchText: string) {
  const queryClient = useQueryClient()
  const { searchTerm, isDebouncing } = useSearchTerm(searchText)
  const query = useProductOptionsQuery({
    pageNumber: 1,
    pageSize: LOOKUP_PAGE_SIZE,
    status: RECORD_STATUS.Active,
    ...(searchTerm ? { searchTerm } : {}),
  })
  const units = useUnitsQuery()
  const lookup = toLookup(query, isDebouncing, query.data?.items, (product: ProductOption) => ({
    value: product.id,
    label: `${product.sku} - ${product.productName}`,
  }))
  const products: readonly ProductOption[] =
    lookup.options.length > 0 ? (query.data?.items ?? []) : []

  // Unknown until the units list loads: whole numbers only, the safe side.
  const getBasePrecision = (product: ProductOption) =>
    units.data?.find((unit) => unit.id === product.unitId)?.quantityPrecision ?? 0

  /** The product with its base unit only: usable at once, before the other units arrive. */
  const getBaseProduct = (product: ProductOption): AiFormProductSnapshot =>
    toAiCatalogProduct(product, getBasePrecision(product), [])

  /** The product with every unit; null when they could not be loaded (the base unit still works). */
  const loadProduct = async (product: ProductOption): Promise<AiFormProductSnapshot | null> => {
    try {
      const conversions = await queryClient.fetchQuery({
        queryKey: queryKeys.products.unitConversions(product.id),
        queryFn: () =>
          productService.getUnitConversions(product.id).then((response) => response.data),
        staleTime: CONVERSIONS_STALE_MS,
      })
      return toAiCatalogProduct(product, getBasePrecision(product), conversions)
    } catch (error) {
      logApiError(error)
      toast.error('Không tải được các đơn vị quy đổi của sản phẩm. Tạm thời chỉ dùng đơn vị cơ sở.')
      return null
    }
  }

  return { ...lookup, products, getBaseProduct, loadProduct }
}
