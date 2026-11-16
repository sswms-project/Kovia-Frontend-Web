'use client'

import { useState, type Dispatch } from 'react'
import { useAiFormProductLookup } from '../../../hooks/use-ai-form-lookups'
import type { AiFormLine } from '../../../schemas/ai-form-card.schema'
import { toAiFormProduct, type AiFormLineErrors } from '../../../utils/ai-form-lines'
import type { AiFormAction } from '../../../utils/ai-form-state'
import { AiFormLineList } from './AiFormLineList'

interface AiFormProductLinesProps {
  readonly idPrefix: string
  /** Screen-reader name of the rows; the stock-issue wording unless a caller says otherwise. */
  readonly legend?: string
  readonly baseUnitOnly?: boolean
  readonly lines: readonly AiFormLine[]
  readonly warehouseId: string
  readonly maxLines: number
  readonly error?: string
  readonly lineErrors?: Readonly<Record<string, AiFormLineErrors>>
  readonly dispatch: Dispatch<AiFormAction>
}

/**
 * Owns the single product search of the form (the row being searched is the only one with its
 * dropdown open) and the lookup of products in the chosen warehouse.
 */
export function AiFormProductLines({
  idPrefix,
  legend,
  baseUnitOnly,
  lines,
  warehouseId,
  maxLines,
  error,
  lineErrors,
  dispatch,
}: AiFormProductLinesProps) {
  const [searchText, setSearchText] = useState('')
  const lookup = useAiFormProductLookup(warehouseId, searchText)

  const changeProduct = (key: string, productId: string) => {
    if (!productId) return dispatch({ type: 'selectProduct', key, product: null })
    const found = lookup.products.find((product) => product.id === productId)
    if (found) dispatch({ type: 'selectProduct', key, product: toAiFormProduct(found) })
  }

  return (
    <AiFormLineList
      idPrefix={idPrefix}
      legend={legend}
      baseUnitOnly={baseUnitOnly}
      lines={lines}
      options={lookup.options}
      isLoadingOptions={lookup.isLoading}
      isLookupError={lookup.isError}
      maxLines={maxLines}
      error={error}
      lineErrors={lineErrors}
      onSearchChange={setSearchText}
      onRetryLookup={lookup.retry}
      onAdd={() => dispatch({ type: 'addLine', maxLines })}
      onProductChange={changeProduct}
      onQuantityChange={(key, quantity) => dispatch({ type: 'setQuantity', key, quantity })}
      onUnitChange={(key, unitId) => dispatch({ type: 'setUnit', key, unitId })}
      onRemove={(key) => dispatch({ type: 'removeLine', key })}
    />
  )
}
