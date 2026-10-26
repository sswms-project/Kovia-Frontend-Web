import { MapPin, Rows3 } from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import { OutlineButton } from './OutlineButton'
import { OutlineToggle } from './OutlineToggle'
import type { DesignerToolboxProps } from './types'

export function RackTreeItem({
  rack,
  slots,
  selection,
  hasStock,
  isOpen,
  onOpenChange,
  onSelect,
}: {
  readonly rack: WarehouseLayoutEditorScene['racks'][number]
  readonly slots: WarehouseLayoutEditorScene['slots']
  readonly selection: WarehouseLayoutSelection | null
  readonly hasStock: boolean
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSelect: DesignerToolboxProps['onSelect']
}) {
  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle
            open={isOpen}
            disabled={slots.length === 0}
            label={`${isOpen ? 'Thu gọn' : 'Mở'} kệ hàng ${rack.rackCode}`}
          />
          <OutlineButton
            label={rack.rackCode}
            detail={rack.status === 'Active' ? rack.rackName : 'Ngừng hoạt động'}
            count={slots.length}
            selected={selection?.kind === 'rack' && selection.id === rack.id}
            hasStock={hasStock}
            icon={<Rows3 aria-hidden="true" />}
            onClick={() => onSelect({ kind: 'rack', id: rack.id })}
          />
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {slots.map((slot) => (
              <li key={slot.id}>
                <OutlineButton
                  label={slot.slotCode}
                  detail="Vị trí lưu trữ"
                  selected={selection?.kind === 'slot' && selection.id === slot.id}
                  hasStock={slot.currentOccupancy > 0}
                  icon={<MapPin aria-hidden="true" />}
                  onClick={() => onSelect({ kind: 'slot', id: slot.id })}
                />
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
