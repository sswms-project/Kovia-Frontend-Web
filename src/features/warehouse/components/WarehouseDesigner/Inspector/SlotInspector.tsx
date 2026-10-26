import type { WarehouseLayoutEditorScene } from '../../../types/warehouse-layout-scene.types'
import { StorageCapacitySummary } from '../../WarehouseDetailPage'
import { InspectorHeader } from './InspectorHeader'

export function SlotInspector({
  scene,
  slotId,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly slotId: string
}) {
  const slot = scene.slots.find((item) => item.id === slotId)
  if (!slot) return null
  const rack = scene.racks.find((item) => item.id === slot.rackId)
  return (
    <>
      <InspectorHeader title="Vị trí lưu trữ" code={slot.slotCode} status={slot.occupancyStatus} />
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 px-4 py-3 text-xs">
        <dt className="text-muted-foreground">Kệ hàng</dt>
        <dd translate="no" className="font-mono">
          {rack?.rackCode ?? '—'}
        </dd>
        <dt className="text-muted-foreground">Sức chứa</dt>
        <dd className="min-w-0">
          <StorageCapacitySummary location={slot} />
        </dd>
        <dt className="text-muted-foreground">Vòng đời</dt>
        <dd>{slot.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</dd>
      </dl>
      <p className="text-muted-foreground px-4 pb-4 text-[11px]">
        Vị trí lưu trữ chỉ được xem trong phiên bản designer này.
      </p>
    </>
  )
}
