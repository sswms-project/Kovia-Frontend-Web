import { APP_ROUTES } from '@/routes/app-routes'

const LIST_QUERY_KEYS = [
  'search',
  'category',
  'warehouse',
  'status',
  'tracking',
  'stock',
  'page',
  'pageSize',
] as const

// Keeps only list filters so a crafted `list` param cannot inject anything beyond /products?...
function pickListQuery(query: string | null | undefined) {
  const source = new URLSearchParams(query ?? '')
  const next = new URLSearchParams()
  for (const key of LIST_QUERY_KEYS) {
    const value = source.get(key)
    if (value) next.set(key, value)
  }
  return next.toString()
}

export function productDetailHref(
  productId: string,
  listQuery: string,
  options: { edit?: boolean } = {}
) {
  const params = new URLSearchParams()
  if (options.edit) params.set('edit', '1')
  const list = pickListQuery(listQuery)
  if (list) params.set('list', list)
  const query = params.toString()
  return query
    ? `${APP_ROUTES.productDetail(productId)}?${query}`
    : APP_ROUTES.productDetail(productId)
}

export function productListHref(listQuery: string | null | undefined) {
  const query = pickListQuery(listQuery)
  return query ? `${APP_ROUTES.products}?${query}` : APP_ROUTES.products
}
