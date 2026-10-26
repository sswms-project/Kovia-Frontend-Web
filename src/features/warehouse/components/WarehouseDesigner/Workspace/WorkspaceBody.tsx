import type { ReactNode } from 'react'
import { Boxes, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

interface WorkspaceBodyProps {
  readonly isCompact: boolean
  readonly canvas: ReactNode
  readonly contextToolbar: ReactNode
  readonly toolbox: ReactNode
  readonly inspector: ReactNode
  readonly hasSelection: boolean
  readonly isToolboxOpen: boolean
  readonly isInspectorOpen: boolean
  readonly onToolboxOpenChange: (open: boolean) => void
  readonly onInspectorOpenChange: (open: boolean) => void
  readonly onOpenToolbox: () => void
  readonly onToolboxCloseAutoFocus: (event: Event) => void
}

export function WorkspaceBody({
  isCompact,
  canvas,
  contextToolbar,
  toolbox,
  inspector,
  hasSelection,
  isToolboxOpen,
  isInspectorOpen,
  onToolboxOpenChange,
  onInspectorOpenChange,
  onOpenToolbox,
  onToolboxCloseAutoFocus,
}: WorkspaceBodyProps) {
  if (!isCompact) {
    return (
      <ResizablePanelGroup orientation="horizontal" className="h-0 min-h-0 min-w-0 flex-1">
        <ResizablePanel defaultSize="18%" minSize="16%" maxSize="22%">
          {toolbox}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="82%" minSize="60%">
          <div className="relative h-full min-h-0">
            {canvas}
            {contextToolbar ? (
              <div className="pointer-events-auto absolute top-4 left-1/2 z-20 -translate-x-1/2">
                {contextToolbar}
              </div>
            ) : null}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  return (
    <>
      <div className="flex items-center border-b px-2 py-1.5">
        <Button type="button" size="sm" variant="outline" onClick={onOpenToolbox}>
          <Boxes data-icon="inline-start" aria-hidden="true" />
          Đối tượng
        </Button>
        <span className="text-muted-foreground ml-auto text-[11px]">
          Chạm đối tượng để xem thuộc tính
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        {canvas}
        {contextToolbar ? (
          <div className="pointer-events-auto absolute top-3 left-1/2 z-20 -translate-x-1/2">
            {contextToolbar}
          </div>
        ) : null}
      </div>
      <Drawer open={isToolboxOpen} onOpenChange={onToolboxOpenChange}>
        <DrawerContent
          className="h-[76dvh] overscroll-contain"
          onCloseAutoFocus={onToolboxCloseAutoFocus}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Đối tượng sơ đồ</DrawerTitle>
            <DrawerDescription>Thêm hoặc chọn thành phần trong sơ đồ kho.</DrawerDescription>
          </DrawerHeader>
          <DrawerClose asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="absolute top-3 right-3 z-10"
              aria-label="Đóng danh sách đối tượng"
            >
              <X aria-hidden="true" />
            </Button>
          </DrawerClose>
          {toolbox}
        </DrawerContent>
      </Drawer>
      <Drawer open={hasSelection && isInspectorOpen} onOpenChange={onInspectorOpenChange}>
        <DrawerContent className="h-[76dvh] overscroll-contain">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Thuộc tính đối tượng</DrawerTitle>
            <DrawerDescription>Xem và chỉnh sửa đối tượng đang chọn.</DrawerDescription>
          </DrawerHeader>
          {inspector}
        </DrawerContent>
      </Drawer>
    </>
  )
}
