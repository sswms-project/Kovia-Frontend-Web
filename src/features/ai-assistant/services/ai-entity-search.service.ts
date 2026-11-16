import { productService } from '@/features/product/services/product.service'
import { staffService } from '@/features/staff/services/staff.service'
import { stockRecipientService } from '@/features/stock-recipient/services/stock-recipient.service'
import { supplierService } from '@/features/supplier/services/supplier.service'
import { warehouseService } from '@/features/warehouse/services/warehouse.service'
import type { WarehouseListQuery } from '@/features/warehouse/types/warehouse.types'
import type {
  AiEntityKind,
  AiEntityPage,
  AiEntityPageRequest,
  AiEntityScope,
} from '../types/ai-entity-selector.types'
import {
  locationOption,
  lotOption,
  productOption,
  recipientOption,
  staffOption,
  supplierOption,
  toAiEntityPage,
  warehouseOption,
} from '../utils/ai-entity-option-mappers'
import { AI_ENTITY_PAGE_SIZE, pageNumberParams, topSkipParams } from '../utils/ai-entity-paging'
import { fetchAiDocumentPage } from './ai-entity-document-search.service'

type Fetcher = (request: AiEntityPageRequest) => Promise<AiEntityPage>

function requireScope(scope: AiEntityScope, key: 'productId' | 'warehouseId'): string {
  const value = scope[key]
  if (!value) throw new Error(`This selector needs ${key}.`)
  return value
}

/** Lots have no server-side search or paging, so the list is filtered and cut into pages here. */
async function fetchLotPage({
  scope,
  searchTerm,
  page,
}: AiEntityPageRequest): Promise<AiEntityPage> {
  const response = await productService.getProductLots(requireScope(scope, 'productId'), {
    warehouseId: scope.warehouseId,
  })
  const needle = searchTerm.toLowerCase()
  const matches = response.data.filter((lot) => lot.lotNumber.toLowerCase().includes(needle))
  const start = page * AI_ENTITY_PAGE_SIZE
  return toAiEntityPage(
    { items: matches.slice(start, start + AI_ENTITY_PAGE_SIZE), totalCount: matches.length },
    lotOption
  )
}

const FETCHERS: Record<AiEntityKind, Fetcher> = {
  warehouse: ({ page, searchTerm }) => {
    // The backend filters warehouses by `status`; `isActive` is ignored.
    const params: WarehouseListQuery & { status: 'Active' } = {
      ...topSkipParams(page, searchTerm),
      status: 'Active',
    }
    return warehouseService
      .getWarehouses(params)
      .then((response) => toAiEntityPage(response.data, warehouseOption))
  },
  // No warehouseId: stock figures need the inventory permission, which a picker must not require.
  product: ({ page, searchTerm }) =>
    productService
      .getProducts({ ...pageNumberParams(page, searchTerm), status: 'Active' })
      .then((response) => toAiEntityPage(response.data, productOption)),
  recipient: ({ page, searchTerm }) =>
    stockRecipientService
      .getStockRecipients({ ...pageNumberParams(page, searchTerm), status: 'Active' })
      .then((response) => toAiEntityPage(response.data, recipientOption)),
  supplier: ({ page, searchTerm }) =>
    supplierService
      .getSuppliers({ ...pageNumberParams(page, searchTerm), status: 'Active' })
      .then((response) => toAiEntityPage(response.data, supplierOption)),
  document: fetchAiDocumentPage,
  lot: fetchLotPage,
  location: ({ scope, page, searchTerm }) =>
    warehouseService
      .getLocations(requireScope(scope, 'warehouseId'), {
        ...topSkipParams(page, searchTerm),
        type: 'Slot',
      })
      .then((response) => toAiEntityPage(response.data, locationOption)),
  staff: ({ page, searchTerm }) =>
    staffService
      .getStaff(topSkipParams(page, searchTerm))
      .then((response) => toAiEntityPage(response.data, staffOption)),
}

/** One page of options for `kind`, straight from its existing backend list endpoint. */
export function fetchAiEntityPage(kind: AiEntityKind, request: AiEntityPageRequest) {
  return FETCHERS[kind](request)
}
