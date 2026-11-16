'use client'

import { useRef, useState, type Dispatch } from 'react'
import { useAiCatalogProductLookup } from '../../../hooks/use-ai-catalog-product-lookup'
import type { AiFormLine } from '../../../schemas/ai-form-card.schema'
import type { AiFormLineErrors } from '../../../utils/ai-form-lines'
import type { AiFormAction } from '../../../utils/ai-form-state'
import { AiFormLineList } from './AiFormLineList'

interface AiCatalogProductLinesProps {
  readonly idPrefix: string
  readonly lines: readonly AiFormLine[]
  readonly maxLines: number
  readonly legend: string
  readonly error?: string
  readonly lineErrors?: Readonly<Record<string, AiFormLineErrors>>
  readonly dispatch: Dispatch<AiFormAction>
}

/**
 * The rows of a document whose products are not bound to a warehouse (inbound): the plain product
 * search, no stock figures. Like AiFormProductLines it owns the one product search of the form.
 */
export function AiCatalogProductLines({
  idPrefix,
  lines,
  maxLines,
  legend,
  error,
  lineErrors,
  dispatch,
}: AiCatalogProductLinesProps) {
  const [searchText, setSearchText] = useState('')
  const lookup = useAiCatalogProductLookup(searchText)
  // The product each row was last given: a slow unit lookup must not undo a newer choice.
  const pickedByRow = useRef(new Map<string, string>())

  const changeProduct = (key: string, productId: string) => {
    pickedByRow.current.set(key, productId)
    if (!productId) return dispatch({ type: 'selectProduct', key, product: null })
    const found = lookup.products.find((product) => product.id === productId)
    if (!found) return
    dispatch({ type: 'selectProduct', key, product: lookup.getBaseProduct(found) })
    void lookup.loadProduct(found).then((product) => {
      if (product && pickedByRow.current.get(key) === productId) {
        dispatch({ type: 'selectProduct', key, product })
      }
    })
  }

  return (
    <AiFormLineList
      idPrefix={idPrefix}
      legend={legend}
      showsStock={false}
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
