'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DecorationInspector } from './DecorationInspector'
import { RackInspector } from './RackInspector'
import { SlotInspector } from './SlotInspector'
import type { DesignerInspectorProps } from './types'
import { ZoneInspector } from './ZoneInspector'

export function DesignerInspector({
  scene,
  selection,
  canConfigure,
  isUpdatingRack,
  isDeactivatingRack,
  onRackNameChange,
  onDecorationChange,
  onClose,
}: DesignerInspectorProps) {
  const content = (() => {
    if (selection.kind === 'zone') {
      const zone = scene.zones.find((item) => item.id === selection.id)
      return zone ? <ZoneInspector zone={zone} /> : null
    }
    if (selection.kind === 'rack') {
      const rack = scene.racks.find((item) => item.id === selection.id)
      return rack ? (
        <RackInspector
          key={`${rack.id}:${rack.rackName}`}
          rack={rack}
          zone={scene.zones.find((zone) => zone.id === rack.zoneId)}
          canConfigure={canConfigure}
          isUpdating={isUpdatingRack}
          isDeactivating={isDeactivatingRack}
          onNameChange={onRackNameChange}
        />
      ) : null
    }
    if (selection.kind === 'decoration') {
      const decoration = scene.decorations.find((item) => item.clientKey === selection.id)
      return decoration ? (
        <DecorationInspector
          decoration={decoration}
          canConfigure={canConfigure}
          onChange={onDecorationChange}
        />
      ) : null
    }
    return <SlotInspector scene={scene} slotId={selection.id} />
  })()

  return (
    <div className="bg-surface-container-lowest relative h-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="absolute top-2 right-2 z-10"
            aria-label="Đóng bảng thuộc tính"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Đóng bảng thuộc tính</TooltipContent>
      </Tooltip>
      <ScrollArea className="h-full">{content}</ScrollArea>
    </div>
  )
}
