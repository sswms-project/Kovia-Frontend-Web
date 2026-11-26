import { InventoryForecastPage } from '@/features/inventory/pages'
export default async function ReportForecastRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string; productId?: string }>
}) {
  const { warehouseId, productId } = await searchParams
  return (
    <InventoryForecastPage
      key={`${warehouseId ?? ''}:${productId ?? ''}`}
      initialWarehouseId={warehouseId}
      initialProductId={productId}
    />
  )
}
