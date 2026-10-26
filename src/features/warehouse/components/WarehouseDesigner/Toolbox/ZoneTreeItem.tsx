import { Layers3 } from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import { OutlineButton } from './OutlineButton'
import { OutlineToggle } from './OutlineToggle'
import { RackTreeItem } from './RackTreeItem'
import type { DesignerToolboxProps, OutlineIdUpdater } from './types'

export function ZoneTreeItem({
  zone,
  racks,
  slotsByRackId,
  selection,
  hasStock,
  isOpen,
  isRackOpen,
  onOpenChange,
  onRackOpenChange,
  onSelect,
}: {
  readonly zone: WarehouseLayoutEditorScene['zones'][number]
  readonly racks: WarehouseLayoutEditorScene['racks']
  readonly slotsByRackId: ReadonlyMap<string, WarehouseLayoutEditorScene['slots']>
  readonly selection: WarehouseLayoutSelection | null
  readonly hasStock: boolean
  readonly isOpen: boolean
  readonly isRackOpen: (rackId: string) => boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRackOpenChange: OutlineIdUpdater
  readonly onSelect: DesignerToolboxProps['onSelect']
}) {
  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle
            open={isOpen}
            disabled={racks.length === 0}
            label={`${isOpen ? 'Thu gọn' : 'Mở'} khu vực ${zone.zoneCode}`}
          />
          <OutlineButton
            label={zone.zoneCode}
            detail={zone.zoneName}
            count={racks.length}
            selected={selection?.kind === 'zone' && selection.id === zone.id}
            hasStock={hasStock}
            icon={<Layers3 aria-hidden="true" />}
            onClick={() => onSelect({ kind: 'zone', id: zone.id })}
          />
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {racks.map((rack) => (
              <RackTreeItem
                key={rack.id}
                rack={rack}
                slots={slotsByRackId.get(rack.id) ?? []}
                selection={selection}
                hasStock={(slotsByRackId.get(rack.id) ?? []).some(
                  (slot) => slot.currentOccupancy > 0
                )}
                isOpen={isRackOpen(rack.id)}
                onOpenChange={(open) => onRackOpenChange(rack.id, open)}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
