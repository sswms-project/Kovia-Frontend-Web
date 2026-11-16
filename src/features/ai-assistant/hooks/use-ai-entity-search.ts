import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { queryKeys } from '@/lib/query-keys'
import { fetchAiEntityPage } from '../services/ai-entity-search.service'
import type { AiEntityKind, AiEntityOption, AiEntityScope } from '../types/ai-entity-selector.types'
import { nextPageIndex } from '../utils/ai-entity-paging'
import {
  getAiEntityPermission,
  getMissingAiEntityScope,
  pickAiEntityScope,
} from '../utils/ai-entity-selector-kinds'
import { useAiEntityAccess } from './use-ai-entity-access'

const SEARCH_DELAY_MS = 300

interface UseAiEntitySearchParams {
  readonly kind: AiEntityKind
  readonly scope?: AiEntityScope
  readonly searchText: string
  readonly enabled?: boolean
}

function dedupeById(pages: readonly (readonly AiEntityOption[])[]): readonly AiEntityOption[] {
  const byId = new Map<string, AiEntityOption>()
  for (const option of pages.flat()) if (!byId.has(option.value)) byId.set(option.value, option)
  return Array.from(byId.values())
}

/** Options of one entity kind matching `searchText`, searched and paged on the server. */
export function useAiEntitySearch({
  kind,
  scope = {},
  searchText,
  enabled = true,
}: UseAiEntitySearchParams) {
  const typed = searchText.trim()
  const searchTerm = useDebouncedValue(typed, SEARCH_DELAY_MS)
  const isDebouncing = searchTerm !== typed
  const keyScope = pickAiEntityScope(kind, scope)
  const missingScope = getMissingAiEntityScope(kind, scope)
  const { hasAccess, isChecking } = useAiEntityAccess(getAiEntityPermission(kind, scope))
  const canQuery = enabled && hasAccess && !missingScope

  const query = useInfiniteQuery({
    queryKey: queryKeys.aiEntitySearch.list(kind, keyScope, searchTerm),
    queryFn: ({ pageParam }) =>
      fetchAiEntityPage(kind, { scope: keyScope, searchTerm, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => nextPageIndex(pages.length, lastPage.totalCount),
    enabled: canQuery,
    retry: 1,
  })

  const loadedOptions = useMemo(
    () => dedupeById(query.data?.pages.map((page) => page.options) ?? []),
    [query.data]
  )
  const isWaiting = canQuery
    ? isDebouncing || query.isPending
    : enabled && isChecking && !missingScope

  return {
    // No placeholder data, and nothing while the user types past the searched text: results of
    // an earlier search never pass for the answer to the current one.
    options: isDebouncing ? [] : loadedOptions,
    isLoading: !query.isError && isWaiting,
    isError: canQuery && query.isError,
    retry: () => void query.refetch(),
    hasNextPage: canQuery && !isDebouncing && query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    /** False when the user's permissions do not cover this list. */
    canUse: hasAccess || isChecking,
    /** The scope key still needed before the list can be requested. */
    missingScope,
  }
}
