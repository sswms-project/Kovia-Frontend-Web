import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import type { OpeningStockImportRow } from '../types/opening-stock-import.types'

export function normalizeOpeningStockLotNumber(value: string) {
  return value.trim().normalize('NFC').toUpperCase()
}

export function getOpeningStockPendingLots(
  rows: readonly OpeningStockImportRow[],
  selected: readonly string[]
) {
  const lots = new Map<string, OpeningStockImportRow>()
  for (const row of rows) {
    if (row.newLot && selected.includes(row.rowKey))
      lots.set(`${row.productId}|${normalizeOpeningStockLotNumber(row.newLot.lotNumber)}`, row)
  }
  return [...lots.values()]
}

export function openingStockErrorMessage(error: unknown, fallback: string) {
  if (!isApiErrorResponse(error)) return getApiErrorMessage(error, fallback)
  return getApiErrorMessage(
    {
      ...error,
      errors: Object.fromEntries(
        Object.entries(error.errors ?? {}).filter(
          ([field]) => !['code', 'errorCode'].includes(field)
        )
      ),
    },
    fallback
  )
}
