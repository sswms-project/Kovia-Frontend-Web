'use client'

import { Copy, MapPin, Palette, RotateCw, Rows3, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LAYOUT_COLOR_SWATCHES } from '../../../utils/layout-decoration-options'
import { ContextAction } from './ContextAction'
import type { DesignerContextToolbarProps } from './types'

const DEFAULT_DECORATION_COLOR = LAYOUT_COLOR_SWATCHES[0]

export function DesignerContextToolbar({
  selection,
  color,
  canConfigure,
  canCreateRack,
  canDuplicate,
  canRemove,
  removeDisabled = false,
  removeDisabledReason,
  removeLabel,
  onOpenDetails,
  onPlacePending,
  onCreateRack,
  onColorChange,
  onRotate,
  onDuplicate,
  onRemove,
}: DesignerContextToolbarProps) {
  const colorTargetLabel = selection.kind === 'zone' ? 'viền khu vực' : 'nền đối tượng'

  return (
    <div className="bg-popover text-popover-foreground flex max-w-[calc(100vw-2rem)] items-stretch overflow-x-auto rounded-md border shadow-lg">
      {onPlacePending ? (
        <ContextAction label="Đặt lên sơ đồ" disabled={!canConfigure} onClick={onPlacePending}>
          <MapPin aria-hidden="true" />
        </ContextAction>
      ) : null}
      {selection.kind === 'zone' ? (
        <>
          <ContextAction label="Khai báo kệ" disabled={!canCreateRack} onClick={onCreateRack}>
            <Rows3 aria-hidden="true" />
          </ContextAction>
          <Separator orientation="vertical" className="h-10 self-center" />
        </>
      ) : null}

      <ContextAction label="Chi tiết vị trí" onClick={onOpenDetails}>
        {selection.kind === 'decoration' ? (
          <Settings2 aria-hidden="true" />
        ) : (
          <MapPin aria-hidden="true" />
        )}
      </ContextAction>

      {selection.kind !== 'slot' ? (
        <>
          <Separator orientation="vertical" className="h-10 self-center" />
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-14 min-w-16 flex-col gap-1 rounded-none px-3 text-[11px]"
                    disabled={!canConfigure}
                  >
                    <Palette aria-hidden="true" />
                    <span>{selection.kind === 'zone' ? 'Màu viền' : 'Đổ màu'}</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Đổi màu {colorTargetLabel}</TooltipContent>
            </Tooltip>
            <PopoverContent align="center" sideOffset={8} className="w-64 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {selection.kind === 'zone' ? 'Màu viền' : 'Màu nền'}
                  </p>
                  <p className="text-muted-foreground text-[11px]">Chọn màu hoặc nhập mã HEX.</p>
                </div>
                <Button type="button" size="xs" variant="ghost" onClick={() => onColorChange(null)}>
                  Mặc định
                </Button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {LAYOUT_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className="ring-offset-background size-8 rounded-full border transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    style={{ backgroundColor: swatch }}
                    aria-label={`Chọn màu ${swatch}`}
                    aria-pressed={color === swatch}
                    onClick={() => onColorChange(swatch)}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="color"
                  value={color ?? DEFAULT_DECORATION_COLOR}
                  className="h-9 w-12 cursor-pointer p-1"
                  aria-label="Chọn màu tùy chỉnh"
                  onChange={(event) => onColorChange(event.target.value.toUpperCase())}
                />
                <Input
                  key={color ?? 'default-color'}
                  placeholder={DEFAULT_DECORATION_COLOR}
                  maxLength={7}
                  className="font-mono uppercase"
                  aria-label="Mã màu HEX"
                  defaultValue={color ?? ''}
                  onBlur={(event) => {
                    const value = event.target.value.toUpperCase()
                    if (/^#[0-9A-F]{6}$/.test(value)) onColorChange(value)
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>

          <ContextAction label="Xoay hình" disabled={!canConfigure} onClick={onRotate}>
            <RotateCw aria-hidden="true" />
          </ContextAction>
        </>
      ) : null}

      {canDuplicate ? (
        <ContextAction label="Nhân bản" disabled={!canConfigure} onClick={onDuplicate}>
          <Copy aria-hidden="true" />
        </ContextAction>
      ) : null}

      {canRemove ? (
        <>
          <Separator orientation="vertical" className="h-10 self-center" />
          <ContextAction
            label={removeLabel}
            destructive
            disabled={!canConfigure || removeDisabled}
            tooltipText={removeDisabled ? removeDisabledReason : removeLabel}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </ContextAction>
        </>
      ) : null}
    </div>
  )
}
