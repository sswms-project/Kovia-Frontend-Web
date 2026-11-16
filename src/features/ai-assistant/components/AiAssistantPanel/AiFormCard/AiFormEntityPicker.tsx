'use client'

import { useState } from 'react'
import { useAiFormEntityLookup } from '../../../hooks/use-ai-form-lookups'
import type { AiFormEntityValue } from '../../../schemas/ai-form-card.schema'
import type { AiFormEntityLookupKey } from '../../../types/ai-form.types'
import { AiFormEntityField } from './AiFormEntityField'

interface AiFormEntityPickerProps {
  readonly id: string
  readonly label: string
  readonly lookup: AiFormEntityLookupKey
  readonly value: AiFormEntityValue | null
  readonly error?: string
  readonly description?: string
  readonly placeholder?: string
  readonly onChange: (value: AiFormEntityValue | null) => void
}

/** Owns the search text of one selector and asks the server for matches as the user types. */
export function AiFormEntityPicker({ lookup, ...fieldProps }: AiFormEntityPickerProps) {
  const [searchText, setSearchText] = useState('')
  const result = useAiFormEntityLookup(lookup, searchText)

  return (
    <AiFormEntityField
      {...fieldProps}
      options={result.options}
      isLoading={result.isLoading}
      isError={result.isError}
      onSearchChange={setSearchText}
      onRetry={result.retry}
    />
  )
}
