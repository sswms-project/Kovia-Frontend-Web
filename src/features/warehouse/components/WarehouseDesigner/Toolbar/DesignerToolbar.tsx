'use client'

import { Grid3X3, HelpCircle, Keyboard, Redo2, Undo2, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { CanvasSettingsSheet } from './CanvasSettingsSheet'
import { ToolbarIconButton } from './ToolbarIconButton'
import { ToolbarInfoPopover } from './ToolbarInfoPopover'
import type { DesignerToolbarProps } from './types'

export function DesignerToolbar({
  title,
  canvas,
  isGridVisible,
  canUndo,
  canRedo,
  isReadOnly,
  onUndo,
  onRedo,
  onToggleGrid,
  onCanvasChange,
  onClose,
}: DesignerToolbarProps) {
  return (
    <header className="bg-surface-container-lowest flex min-h-16 shrink-0 flex-wrap items-center gap-1 border-b px-5 py-2">
      <h1 className="mr-auto truncate text-xl font-semibold">{title}</h1>
      <ToolbarIconButton label="Hoàn tác" disabled={!canUndo || isReadOnly} onClick={onUndo}>
        <Undo2 aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Làm lại" disabled={!canRedo || isReadOnly} onClick={onRedo}>
        <Redo2 aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Hiện lưới" pressed={isGridVisible} onClick={onToggleGrid}>
        <Grid3X3 aria-hidden="true" />
      </ToolbarIconButton>

      <CanvasSettingsSheet canvas={canvas} disabled={isReadOnly} onSubmit={onCanvasChange} />
      <ToolbarInfoPopover label="Phím tắt" icon={<Keyboard aria-hidden="true" />}>
        <p className="mb-2 font-medium">Phím tắt thiết kế</p>
        <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="text-foreground font-mono">Ctrl + Z</dt>
          <dd>Hoàn tác</dd>
          <dt className="text-foreground font-mono">Ctrl + Y</dt>
          <dd>Làm lại</dd>
          <dt className="text-foreground font-mono">Delete</dt>
          <dd>Xóa biểu tượng đang chọn</dd>
          <dt className="text-foreground font-mono">Esc</dt>
          <dd>Hủy thao tác đang kéo hoặc bỏ chọn</dd>
          <dt className="text-foreground font-mono">Shift + click</dt>
          <dd>Thêm hoặc bỏ kệ khỏi tập chọn</dd>
          <dt className="text-foreground font-mono">Ctrl / Cmd + A</dt>
          <dd>Chọn tất cả kệ đã bố trí khi đang ở mặt bằng</dd>
          <dt className="text-foreground font-mono">Mũi tên</dt>
          <dd>Dịch kệ theo một bước lưới; giữ Shift để dịch mười bước</dd>
        </dl>
      </ToolbarInfoPopover>
      <ToolbarInfoPopover label="Trợ giúp" icon={<HelpCircle aria-hidden="true" />}>
        <p className="font-medium">Thiết kế sơ đồ kho</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Kéo biểu tượng từ bảng bên trái vào mặt bằng. Chọn đối tượng để đổi màu, xoay hoặc mở
          thông tin chi tiết. Giữ chuột trái và kéo trên nền để khoanh các kệ, rồi chọn lệnh ngay
          cạnh vùng chọn. Ctrl + kéo để di chuyển góc nhìn. Hít đối tượng ưu tiên mép/tâm kệ; ẩn
          lưới không tắt hít lưới. Sơ đồ không thay đổi vị trí hay sức chứa nghiệp vụ.
        </p>
      </ToolbarInfoPopover>
      <Separator orientation="vertical" className="mx-1 h-7" />
      <ToolbarIconButton label="Đóng trình thiết kế" onClick={onClose}>
        <X aria-hidden="true" />
      </ToolbarIconButton>
    </header>
  )
}
