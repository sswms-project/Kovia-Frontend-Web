'use client'

import { LoaderCircle, Save, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ToolbarIconButton } from './ToolbarIconButton'
import type { DesignerFooterProps } from './types'

export function DesignerFooter({
  zoomPercent,
  canSave,
  isSaving,
  isReadOnly,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  onFit,
  onCancel,
  onSave,
}: DesignerFooterProps) {
  return (
    <footer className="bg-surface-container-lowest flex min-h-14 shrink-0 items-center border-t px-5 py-2">
      <div className="ml-auto flex items-center gap-1">
        <ToolbarIconButton label="Thu nhỏ" onClick={onZoomOut}>
          <ZoomOut aria-hidden="true" />
        </ToolbarIconButton>
        <input
          type="range"
          min={20}
          max={400}
          step={5}
          value={zoomPercent}
          aria-label="Thu phóng sơ đồ"
          className="accent-primary focus-visible:ring-ring w-28 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          onChange={(event) => onZoomTo(Number(event.currentTarget.value))}
        />
        <ToolbarIconButton label="Phóng to" onClick={onZoomIn}>
          <ZoomIn aria-hidden="true" />
        </ToolbarIconButton>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground w-12 text-center font-mono text-xs tabular-nums"
          onClick={onFit}
          aria-label="Đưa sơ đồ vừa màn hình"
        >
          {zoomPercent}%
        </button>
      </div>
      <Separator orientation="vertical" className="mx-4 h-7" />
      <Button type="button" variant="outline" className="min-w-24" onClick={onCancel}>
        Hủy
      </Button>
      <Button
        type="button"
        className="ml-2 min-w-24"
        disabled={!canSave || isSaving || isReadOnly}
        onClick={onSave}
      >
        {isSaving ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        ) : (
          <Save data-icon="inline-start" aria-hidden="true" />
        )}
        {isSaving ? 'Đang lưu…' : 'Lưu'}
      </Button>
    </footer>
  )
}
