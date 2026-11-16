import type { ReactNode } from 'react'
import { InventoryFiltersProvider } from '@/features/inventory/hooks/use-inventory-filter'

export default function InventoryLayout({ children }: { readonly children: ReactNode }) {
  return <InventoryFiltersProvider>{children}</InventoryFiltersProvider>
}
