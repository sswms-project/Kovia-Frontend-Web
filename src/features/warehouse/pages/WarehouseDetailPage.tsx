'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { WarehouseOverview } from '../components/WarehouseDetailPage'
import { useWarehouseQuery } from '../hooks/use-warehouse'

interface WarehouseDetailPageProps {
  readonly warehouseId: string
}

export function WarehouseDetailPage({ warehouseId }: WarehouseDetailPageProps) {
  const warehouseQuery = useWarehouseQuery(warehouseId)

  if (!warehouseQuery.data) {
    return <Skeleton className="h-72" />
  }

  return <WarehouseOverview warehouse={warehouseQuery.data} />
}
