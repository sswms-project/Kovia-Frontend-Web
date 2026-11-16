'use client'

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

type FilterValue = string | number | boolean
type FilterState = Record<string, FilterValue | undefined>

const InventoryFiltersContext = createContext<{
  readonly values: FilterState
  readonly setValue: (key: string, value: FilterValue) => void
} | null>(null)

export function InventoryFiltersProvider({ children }: { readonly children: ReactNode }) {
  const [values, setValues] = useState<FilterState>({})
  const setValue = useCallback((key: string, value: FilterValue) => {
    setValues((previous) =>
      key === 'warehouse' && previous.warehouse !== value
        ? {
            ...previous,
            warehouse: value,
            'InventoryPage.slotId': '',
            'StockMovementsPage.slotId': '',
          }
        : { ...previous, [key]: value }
    )
  }, [])
  return (
    <InventoryFiltersContext.Provider value={{ values, setValue }}>
      {children}
    </InventoryFiltersContext.Provider>
  )
}

export function useInventoryFilter<T extends FilterValue>(
  key: string,
  initial: T
): [T, (value: T) => void] {
  const context = useContext(InventoryFiltersContext)
  const [localValue, setLocalValue] = useState(initial)
  const setSharedValue = context?.setValue
  const setValue = useCallback(
    (value: T) => {
      if (setSharedValue) setSharedValue(key, value)
      else setLocalValue(value)
    },
    [key, setSharedValue]
  )
  return [context ? ((context.values[key] as T | undefined) ?? initial) : localValue, setValue]
}
