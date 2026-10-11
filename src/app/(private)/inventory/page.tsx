import { InventoryPage } from '@/features/inventory/pages'

export default async function InventoryRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string; productId?: string }>
}) {
  const { warehouseId, productId } = await searchParams
  return (
    <InventoryPage
      key={`${warehouseId ?? ''}:${productId ?? ''}`}
      initialWarehouseId={warehouseId}
      initialProductId={productId}
    />
  )
}
