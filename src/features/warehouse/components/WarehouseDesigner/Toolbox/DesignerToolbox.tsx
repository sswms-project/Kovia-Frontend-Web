'use client'

import { Search, Square } from 'lucide-react'
import { useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PALETTE_DECORATION_OPTIONS } from '../../../utils/layout-decoration-options'
import { WarehouseUnplacedLocations } from '../WarehouseUnplacedLocations'
import { DecorationPaletteIcon } from './DecorationPaletteIcon'
import { PaletteIconAction } from './PaletteIconAction'
import { RackShapeIcon } from './RackShapeIcon'
import { SceneOutlineTree } from './SceneOutlineTree'
import type { DesignerToolboxProps } from './types'

export function DesignerToolbox({
  scene,
  selection,
  canConfigure,
  mode = 'designer',
  onCreateZone,
  onCreateRack,
  onCreateDecoration,
  onSelect,
  onSelectUnplaced,
}: DesignerToolboxProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const selectedZoneCandidateId =
    selection?.kind === 'zone'
      ? selection.id
      : selection?.kind === 'rack'
        ? scene.racks.find((rack) => rack.id === selection.id)?.zoneId
        : undefined
  const selectedZoneId = scene.zones.find(
    (zone) => zone.id === selectedZoneCandidateId && zone.status === 'Active'
  )?.id
  return (
    <div className="bg-surface-container-lowest flex h-full min-h-0 flex-col overflow-hidden">
      <div className={cn('shrink-0 px-4 py-4', mode === 'viewer' && 'pb-0')}>
        {mode === 'viewer' ? (
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="shrink-0 text-base font-semibold">Danh sách vị trí</h2>
            <InputGroup className="ml-auto max-w-64">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                name="warehouse-layout-location-search"
                autoComplete="off"
                value={searchTerm}
                placeholder="Tìm vị trí…"
                aria-label="Tìm vị trí trên sơ đồ"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </InputGroup>
          </div>
        ) : (
          <h2 className="text-base font-semibold">Chọn biểu tượng</h2>
        )}
        {mode === 'designer' ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Nhấn hoặc kéo thả biểu tượng để thêm vào sơ đồ.
          </p>
        ) : null}
      </div>
      <WarehouseUnplacedLocations scene={scene} onSelect={onSelectUnplaced ?? onSelect} />
      {mode === 'designer' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <section aria-labelledby="business-tools-title">
            <h3
              id="business-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Khu vực lưu trữ
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <PaletteIconAction
                label="Khu vực"
                disabled={!canConfigure}
                disabledReason="Bạn chỉ có quyền xem sơ đồ."
                onClick={onCreateZone}
                dragData={{ kind: 'zone' }}
                icon={<Square className="size-8" aria-hidden="true" />}
              />
            </div>
          </section>

          <Separator className="my-4" />
          <section aria-labelledby="rack-tools-title">
            <h3
              id="rack-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Kệ hàng
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Standard')}
                dragData={{ kind: 'rack', shape: 'Standard' }}
                icon={<RackShapeIcon shape="Standard" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Vertical')}
                dragData={{ kind: 'rack', shape: 'Vertical' }}
                icon={<RackShapeIcon shape="Vertical" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('CrossBraced')}
                dragData={{ kind: 'rack', shape: 'CrossBraced' }}
                icon={<RackShapeIcon shape="CrossBraced" />}
              />
              <PaletteIconAction
                label="Kệ"
                disabled={!canConfigure || !selectedZoneId}
                disabledReason={
                  !canConfigure
                    ? 'Bạn chỉ có quyền xem sơ đồ.'
                    : 'Chọn một khu vực trước khi thêm kệ.'
                }
                onClick={() => onCreateRack('Pallet')}
                dragData={{ kind: 'rack', shape: 'Pallet' }}
                icon={<RackShapeIcon shape="Pallet" />}
              />
            </div>
          </section>

          <Separator className="my-4" />
          <section aria-labelledby="decoration-tools-title">
            <h3
              id="decoration-tools-title"
              className="text-muted-foreground mb-2 text-[11px] font-medium"
            >
              Khác
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE_DECORATION_OPTIONS.map((option) => (
                <PaletteIconAction
                  key={option.type}
                  label={option.label}
                  disabled={!canConfigure}
                  disabledReason="Bạn chỉ có quyền xem sơ đồ."
                  onClick={() => onCreateDecoration(option.type, option.label)}
                  dragData={{ kind: 'decoration', type: option.type, label: option.label }}
                  icon={<DecorationPaletteIcon type={option.type} />}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {mode === 'viewer' ? (
        <section
          aria-labelledby="scene-outline-title"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <SceneOutlineTree
            scene={scene}
            selection={selection}
            mode={mode}
            query={searchTerm}
            title="Cấu trúc vị trí"
            showDecorations={false}
            onSelect={onSelect}
          />
        </section>
      ) : null}
    </div>
  )
}
