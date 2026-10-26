import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import { DesignerToolbox } from '../Toolbox'
import type { WarehouseLayoutPicker } from './types'

export function ViewerLocationTree({
  scene,
  selection,
  picker,
  onSelect,
  onSelectUnplaced,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly picker?: WarehouseLayoutPicker
  readonly onSelect: (selection: WarehouseLayoutSelection | null) => void
  readonly onSelectUnplaced: (selection: WarehouseLayoutSelection | null) => void
}) {
  const toolbox = (
    <DesignerToolbox
      scene={scene}
      selection={selection}
      canConfigure={false}
      mode="viewer"
      onCreateZone={() => undefined}
      onCreateRack={() => undefined}
      onCreateDecoration={() => undefined}
      onSelect={onSelect}
      onSelectUnplaced={onSelectUnplaced}
    />
  )
  if (!picker?.quickPicks) return toolbox

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">{toolbox}</div>
      <section
        aria-label={picker.quickPicksTitle}
        className="max-h-40 shrink-0 overflow-auto border-t p-2"
      >
        <h3 className="text-muted-foreground px-1 pb-1 text-xs font-medium">
          {picker.quickPicksTitle}
        </h3>
        {picker.quickPicks.length === 0 ? (
          <p className="text-muted-foreground px-1 text-xs">Không có vị trí nào.</p>
        ) : (
          <ul className="grid gap-1">
            {picker.quickPicks.map((location) => (
              <li key={location.slotId}>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-accent flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs',
                    selection?.kind === 'slot' &&
                      selection.id === location.slotId &&
                      'bg-accent font-medium'
                  )}
                  onClick={() => onSelect({ kind: 'slot', id: location.slotId })}
                >
                  <MapPin aria-hidden="true" className="size-3 shrink-0" />
                  <span className="min-w-0 break-words">{location.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
