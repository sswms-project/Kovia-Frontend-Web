import WarehouseLocationImportPage from '@/features/warehouse/pages/WarehouseLocationImportPage'

export default async function WarehouseLocationImportRoute({
  params,
}: {
  readonly params: Promise<{ warehouseId: string }>
}) {
  const { warehouseId } = await params
  return <WarehouseLocationImportPage warehouseId={warehouseId} />
}
