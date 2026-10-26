import { Box, ChevronsUp, MapPin, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  filterOutlineScene,
  getSelectedPath,
  groupBy,
  updateIdSet,
} from '../../../utils/layout-outline'
import { OutlineButton } from './OutlineButton'
import { OutlineGroup } from './OutlineGroup'
import { RackTreeItem } from './RackTreeItem'
import type { DesignerToolboxProps, OutlineIdUpdater } from './types'
import { ZoneTreeItem } from './ZoneTreeItem'

export function SceneOutlineTree({
  scene: sourceScene,
  selection,
  mode,
  query,
  title,
  showDecorations,
  onSelect,
}: Pick<DesignerToolboxProps, 'scene' | 'selection' | 'onSelect' | 'mode'> & {
  readonly query: string
  readonly title: string
  readonly showDecorations: boolean
}) {
  const scene = useMemo(() => filterOutlineScene(sourceScene, query), [query, sourceScene])
  const [openZoneIds, setOpenZoneIds] = useState<ReadonlySet<string>>(() => new Set())
  const [openRackIds, setOpenRackIds] = useState<ReadonlySet<string>>(() => new Set())
  const [isDecorationGroupOpen, setIsDecorationGroupOpen] = useState(false)
  const [isUnclassifiedGroupOpen, setIsUnclassifiedGroupOpen] = useState(false)

  const zoneIds = useMemo(() => new Set(scene.zones.map((zone) => zone.id)), [scene.zones])
  const rackIds = useMemo(() => new Set(scene.racks.map((rack) => rack.id)), [scene.racks])
  const racksByZoneId = useMemo(() => groupBy(scene.racks, (rack) => rack.zoneId), [scene.racks])
  const slotsByRackId = useMemo(() => groupBy(scene.slots, (slot) => slot.rackId), [scene.slots])
  const orphanRacks = useMemo(
    () => scene.racks.filter((rack) => !zoneIds.has(rack.zoneId)),
    [scene.racks, zoneIds]
  )
  const orphanSlots = useMemo(
    () => scene.slots.filter((slot) => !rackIds.has(slot.rackId)),
    [rackIds, scene.slots]
  )

  const selectedPath = getSelectedPath(scene, selection, zoneIds, rackIds)
  const hasQuery = Boolean(query.trim())
  const isZoneOpen = (zoneId: string) =>
    hasQuery || openZoneIds.has(zoneId) || selectedPath.zoneId === zoneId
  const isRackOpen = (rackId: string) =>
    hasQuery || openRackIds.has(rackId) || selectedPath.rackId === rackId
  const decorationGroupOpen = isDecorationGroupOpen || selection?.kind === 'decoration'
  const unclassifiedGroupOpen = isUnclassifiedGroupOpen || selectedPath.isUnclassified
  const hasManuallyExpandedGroup =
    openZoneIds.size > 0 || openRackIds.size > 0 || isDecorationGroupOpen || isUnclassifiedGroupOpen

  const updateZoneOpen: OutlineIdUpdater = (zoneId, open) =>
    setOpenZoneIds((current) => updateIdSet(current, zoneId, open))
  const updateRackOpen: OutlineIdUpdater = (rackId, open) =>
    setOpenRackIds((current) => updateIdSet(current, rackId, open))

  function collapseAll() {
    setOpenZoneIds(new Set())
    setOpenRackIds(new Set())
    setIsDecorationGroupOpen(false)
    setIsUnclassifiedGroupOpen(false)
  }

  const totalCount =
    scene.zones.length +
    scene.racks.length +
    scene.slots.length +
    (showDecorations ? scene.decorations.length : 0)

  return (
    <>
      <div className="bg-surface-container-lowest flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <h3 id="scene-outline-title" className="text-muted-foreground text-[11px] font-medium">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <Badge variant="outline">{totalCount}</Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={!hasManuallyExpandedGroup}
                  aria-label="Thu gọn tất cả"
                  onClick={collapseAll}
                >
                  <ChevronsUp aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {hasManuallyExpandedGroup
                ? 'Thu gọn tất cả'
                : selection
                  ? 'Nhánh đang chọn luôn được mở'
                  : 'Các nhóm đang được thu gọn'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" type="always">
        <div className="px-2 pb-3">
          {totalCount === 0 ? (
            <p className="text-muted-foreground py-3 text-center text-[11px]">
              {query.trim() ? 'Không tìm thấy vị trí phù hợp.' : 'Sơ đồ chưa có đối tượng.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {scene.zones.map((zone) => {
                const racks = racksByZoneId.get(zone.id) ?? []
                return (
                  <ZoneTreeItem
                    key={zone.id}
                    zone={zone}
                    racks={racks}
                    slotsByRackId={slotsByRackId}
                    selection={selection}
                    hasStock={
                      mode === 'viewer' &&
                      scene.slots.some(
                        (slot) => slot.zoneId === zone.id && slot.currentOccupancy > 0
                      )
                    }
                    isOpen={isZoneOpen(zone.id)}
                    isRackOpen={isRackOpen}
                    onOpenChange={(open) => updateZoneOpen(zone.id, open)}
                    onRackOpenChange={updateRackOpen}
                    onSelect={onSelect}
                  />
                )
              })}

              {showDecorations && scene.decorations.length > 0 ? (
                <OutlineGroup
                  label="Khu chức năng"
                  count={scene.decorations.length}
                  icon={<Box aria-hidden="true" />}
                  open={decorationGroupOpen}
                  onOpenChange={setIsDecorationGroupOpen}
                >
                  {scene.decorations.map((decoration) => (
                    <li key={decoration.clientKey}>
                      <OutlineButton
                        label={decoration.label}
                        detail="Khu chức năng"
                        selected={
                          selection?.kind === 'decoration' && selection.id === decoration.clientKey
                        }
                        icon={<Box aria-hidden="true" />}
                        onClick={() => onSelect({ kind: 'decoration', id: decoration.clientKey })}
                      />
                    </li>
                  ))}
                </OutlineGroup>
              ) : null}

              {orphanRacks.length > 0 || orphanSlots.length > 0 ? (
                <OutlineGroup
                  label="Chưa phân loại"
                  count={orphanRacks.length + orphanSlots.length}
                  icon={<TriangleAlert aria-hidden="true" />}
                  open={unclassifiedGroupOpen}
                  onOpenChange={setIsUnclassifiedGroupOpen}
                >
                  {orphanRacks.map((rack) => (
                    <RackTreeItem
                      key={rack.id}
                      rack={rack}
                      slots={slotsByRackId.get(rack.id) ?? []}
                      selection={selection}
                      hasStock={(slotsByRackId.get(rack.id) ?? []).some(
                        (slot) => slot.currentOccupancy > 0
                      )}
                      isOpen={isRackOpen(rack.id)}
                      onOpenChange={(open) => updateRackOpen(rack.id, open)}
                      onSelect={onSelect}
                    />
                  ))}
                  {orphanSlots.map((slot) => (
                    <li key={slot.id}>
                      <OutlineButton
                        label={slot.slotCode}
                        detail="Không tìm thấy kệ hàng"
                        selected={selection?.kind === 'slot' && selection.id === slot.id}
                        hasStock={slot.currentOccupancy > 0}
                        icon={<MapPin aria-hidden="true" />}
                        onClick={() => onSelect({ kind: 'slot', id: slot.id })}
                      />
                    </li>
                  ))}
                </OutlineGroup>
              ) : null}
            </ul>
          )}
        </div>
      </ScrollArea>
    </>
  )
}
