import type { WarehouseLayoutEditorZone } from '../../../types/warehouse-layout-scene.types'
import { InspectorHeader } from './InspectorHeader'

export function ZoneInspector({ zone }: { readonly zone: WarehouseLayoutEditorZone }) {
  return (
    <>
      <InspectorHeader title="Khu vực" code={zone.zoneCode} status={zone.status} />
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 px-4 pb-3 text-xs">
        <dt className="text-muted-foreground">Tên</dt>
        <dd className="truncate">{zone.zoneName}</dd>
      </dl>
      <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
        Kéo các điểm điều khiển trực tiếp trên sơ đồ để thay đổi kích thước; dùng toolbar nổi để đổi
        màu hoặc xoay khu vực.
      </p>
    </>
  )
}
