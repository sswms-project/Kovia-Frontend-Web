'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Grid3X3,
  HelpCircle,
  Keyboard,
  LoaderCircle,
  Redo2,
  Save,
  Settings2,
  Undo2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  warehouseLayoutCanvasSchema,
  type WarehouseLayoutCanvasFormValues,
} from '../../schemas/warehouse-layout-scene.schema'
import type { WarehouseLayoutCanvas } from '../../types/warehouse-layout-scene.types'

interface DesignerToolbarProps {
  readonly title: string
  readonly canvas: WarehouseLayoutCanvas
  readonly isGridVisible: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly isReadOnly: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onToggleGrid: () => void
  readonly onCanvasChange: (canvas: WarehouseLayoutCanvas) => void
  readonly onClose: () => void
}

interface ToolbarIconButtonProps {
  readonly label: string
  readonly disabled?: boolean
  readonly pressed?: boolean
  readonly onClick: () => void
  readonly children: React.ReactNode
}

function ToolbarIconButton({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            size="icon-sm"
            variant={pressed ? 'secondary' : 'ghost'}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ToolbarInfoPopover({
  label,
  icon,
  children,
}: {
  readonly label: string
  readonly icon: React.ReactNode
  readonly children: React.ReactNode
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label={label}>
              {icon}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 text-sm">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function CanvasSettingsSheet({
  canvas,
  disabled,
  onSubmit,
}: {
  readonly canvas: WarehouseLayoutCanvas
  readonly disabled: boolean
  readonly onSubmit: (canvas: WarehouseLayoutCanvas) => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<WarehouseLayoutCanvasFormValues>({
    resolver: zodResolver(warehouseLayoutCanvasSchema),
    values: canvas,
  })
  const { errors } = form.formState

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Cài đặt nền"
              disabled={disabled}
            >
              <Settings2 aria-hidden="true" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Cài đặt nền</TooltipContent>
      </Tooltip>
      <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Cài đặt nền</SheetTitle>
          <SheetDescription>Đặt kích thước cố định và bước lưới của mặt bằng kho.</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            if (disabled) return
            onSubmit(values)
            setOpen(false)
          })}
        >
          <FieldGroup className="p-4">
            <CanvasNumberField
              id="canvas-width"
              label="Chiều rộng mặt bằng"
              error={errors.width}
              registration={form.register('width', { valueAsNumber: true })}
            />
            <CanvasNumberField
              id="canvas-height"
              label="Chiều cao mặt bằng"
              error={errors.height}
              registration={form.register('height', { valueAsNumber: true })}
            />
            <CanvasNumberField
              id="canvas-grid-size"
              label="Bước lưới"
              error={errors.gridSize}
              registration={form.register('gridSize', { valueAsNumber: true })}
            />
          </FieldGroup>
          <SheetFooter>
            <Button type="submit" disabled={disabled}>
              <Check data-icon="inline-start" aria-hidden="true" />
              Áp dụng
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CanvasNumberField({
  id,
  label,
  error,
  registration,
}: {
  readonly id: string
  readonly label: string
  readonly error: ReturnType<
    ReturnType<typeof useForm<WarehouseLayoutCanvasFormValues>>['getFieldState']
  >['error']
  readonly registration: ReturnType<
    ReturnType<typeof useForm<WarehouseLayoutCanvasFormValues>>['register']
  >
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        {...registration}
      />
      <FieldError errors={[error]} />
    </Field>
  )
}

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
}: {
  readonly zoomPercent: number
  readonly canSave: boolean
  readonly isSaving: boolean
  readonly isReadOnly: boolean
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onZoomTo: (zoomPercent: number) => void
  readonly onFit: () => void
  readonly onCancel: () => void
  readonly onSave: () => void
}) {
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
