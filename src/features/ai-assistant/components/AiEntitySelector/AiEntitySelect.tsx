'use client'

import { useState } from 'react'
import { useAiEntitySearch } from '../../hooks/use-ai-entity-search'
import type { AiFormEntityValue } from '../../schemas/ai-form-card.schema'
import type { AiEntityKind, AiEntityScope } from '../../types/ai-entity-selector.types'
import {
  AI_ENTITY_KINDS,
  AI_ENTITY_MISSING_SCOPE_MESSAGES,
  AI_ENTITY_NO_PERMISSION_MESSAGE,
} from '../../utils/ai-entity-selector-kinds'
import { AiEntitySelector } from './AiEntitySelector'

interface AiEntitySelectProps {
  readonly id: string
  readonly kind: AiEntityKind
  /** Required keys depend on the kind: documentType, productId, warehouseId. */
  readonly scope?: AiEntityScope
  /** The chosen record (backend GUID + label); clear it yourself when `scope` changes. */
  readonly value: AiFormEntityValue | null
  readonly onChange: (value: AiFormEntityValue | null) => void
  /** Defaults to the kind's Vietnamese name. */
  readonly label?: string
  readonly description?: string
  readonly error?: string
  /** False keeps the list from loading, for example while the form step is hidden. */
  readonly enabled?: boolean
}

/** Owns the search text of one selector and asks the backend for matches as the user types. */
export function AiEntitySelect({
  id,
  kind,
  scope,
  value,
  onChange,
  label,
  description,
  error,
  enabled,
}: AiEntitySelectProps) {
  const [searchText, setSearchText] = useState('')
  const search = useAiEntitySearch({ kind, scope, searchText, enabled })
  const config = AI_ENTITY_KINDS[kind]
  const disabledReason = !search.canUse
    ? AI_ENTITY_NO_PERMISSION_MESSAGE
    : search.missingScope
      ? AI_ENTITY_MISSING_SCOPE_MESSAGES[search.missingScope]
      : undefined

  return (
    <AiEntitySelector
      id={id}
      label={label ?? config.label}
      value={value}
      options={search.options}
      placeholder={config.searchPlaceholder}
      emptyMessage={config.emptyMessage}
      isLoading={search.isLoading}
      isError={search.isError}
      hasMore={search.hasNextPage}
      isLoadingMore={search.isFetchingNextPage}
      disabledReason={disabledReason}
      description={description}
      error={error}
      onSearchChange={setSearchText}
      onRetry={search.retry}
      onLoadMore={search.fetchNextPage}
      onChange={onChange}
    />
  )
}
