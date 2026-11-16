import { useSupplierOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import {
  RECORD_STATUS,
  type LookupOption,
} from '@/features/inbound-request/types/inbound-request.types'
import {
  useStockIssueProductOptionsQuery,
  useStockRecipientOptionsQuery,
} from '@/features/stock-issue/hooks/use-stock-issue-requests'
import type { StockIssueProductOption } from '@/features/stock-issue/types/stock-issue.types'
import { formatStockIssueUnitQuantity } from '@/features/stock-issue/utils/stock-issue-format'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { AI_FORM_LOOKUPS, type AiFormEntityLookupKey } from '../types/ai-form.types'

const LOOKUP_PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

export interface AiFormLookup {
  /** Empty while loading: results of an earlier search are never shown for the current one. */
  readonly options: readonly LookupOption[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly retry: () => void
}

interface LookupQueryState {
  readonly isPending: boolean
  readonly isPlaceholderData: boolean
  readonly isError: boolean
  readonly refetch: () => unknown
}

/** The search text the server is asked for, and whether the user has typed past it. */
export function useSearchTerm(searchText: string) {
  const typed = searchText.trim()
  const searchTerm = useDebouncedValue(typed, SEARCH_DELAY_MS)
  return { searchTerm, isDebouncing: searchTerm !== typed }
}

export function toLookup<TItem>(
  query: LookupQueryState,
  isDebouncing: boolean,
  items: readonly TItem[] | undefined,
  toOption: (item: TItem) => LookupOption
): AiFormLookup {
  // `placeholderData` keeps the previous results while a new search loads; they must not look like its answer.
  const isLoading = !query.isError && (query.isPending || query.isPlaceholderData || isDebouncing)
  return {
    options: isLoading || query.isError ? [] : (items ?? []).map(toOption),
    isLoading,
    isError: query.isError,
    retry: () => void query.refetch(),
  }
}

/** Active warehouses, recipients or suppliers matching `searchText`, searched on the server. */
export function useAiFormEntityLookup(lookup: AiFormEntityLookupKey, searchText: string) {
  const { searchTerm, isDebouncing } = useSearchTerm(searchText)
  const warehouses = useWarehousesQuery(
    {
      top: LOOKUP_PAGE_SIZE,
      skip: 0,
      needTotalCount: true,
      isActive: true,
      ...(searchTerm ? { searchText: searchTerm } : {}),
    },
    lookup === AI_FORM_LOOKUPS.warehouses
  )
  const recipients = useStockRecipientOptionsQuery(
    {
      pageNumber: 1,
      pageSize: LOOKUP_PAGE_SIZE,
      status: 'Active',
      ...(searchTerm ? { searchTerm } : {}),
    },
    lookup === AI_FORM_LOOKUPS.recipients
  )
  const suppliers = useSupplierOptionsQuery(
    {
      pageNumber: 1,
      pageSize: LOOKUP_PAGE_SIZE,
      status: RECORD_STATUS.Active,
      ...(searchTerm ? { searchTerm } : {}),
    },
    lookup === AI_FORM_LOOKUPS.suppliers
  )

  switch (lookup) {
    case AI_FORM_LOOKUPS.warehouses:
      return toLookup(warehouses, isDebouncing, warehouses.data?.items, (warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      }))
    case AI_FORM_LOOKUPS.recipients:
      return toLookup(recipients, isDebouncing, recipients.data?.items, (recipient) => ({
        value: recipient.id,
        label: `${recipient.recipientCode} - ${recipient.recipientName}`,
      }))
    case AI_FORM_LOOKUPS.suppliers:
      // A supplier has no code: the name is the whole label.
      return toLookup(suppliers, isDebouncing, suppliers.data?.items, (supplier) => ({
        value: supplier.id,
        label: supplier.supplierName,
      }))
  }
}

/** Products with available stock in the warehouse; `products` holds the full records behind `options`. */
export function useAiFormProductLookup(warehouseId: string, searchText: string) {
  const { searchTerm, isDebouncing } = useSearchTerm(searchText)
  const query = useStockIssueProductOptionsQuery({
    warehouseId,
    pageSize: LOOKUP_PAGE_SIZE,
    ...(searchTerm ? { searchTerm } : {}),
  })
  const lookup = toLookup(query, isDebouncing, query.data, (product: StockIssueProductOption) => ({
    value: product.id,
    label: `${product.sku} - ${product.productName}`,
    description: `Tồn khả dụng ${formatStockIssueUnitQuantity(product.availableQuantity, product.unitName)}`,
  }))
  const products: readonly StockIssueProductOption[] =
    lookup.options.length > 0 ? (query.data ?? []) : []
  return { ...lookup, products }
}
