export const AI_ENTITY_PAGE_SIZE = 20

/** Paging style A (QueryInfo): `top`/`skip` with `totalCount`. `page` is zero-based. */
export function topSkipParams(page: number, searchTerm: string) {
  return {
    top: AI_ENTITY_PAGE_SIZE,
    skip: page * AI_ENTITY_PAGE_SIZE,
    needTotalCount: true as const,
    ...(searchTerm ? { searchText: searchTerm } : {}),
  }
}

/** Paging style B: `pageNumber`/`pageSize` (one-based on the wire) with `totalCount`. */
export function pageNumberParams(page: number, searchTerm: string) {
  return {
    pageNumber: page + 1,
    pageSize: AI_ENTITY_PAGE_SIZE,
    ...(searchTerm ? { searchTerm } : {}),
  }
}

/** The next zero-based page to request, or `undefined` once every record is loaded. */
export function nextPageIndex(loadedPages: number, totalCount: number): number | undefined {
  return loadedPages * AI_ENTITY_PAGE_SIZE < totalCount ? loadedPages : undefined
}
