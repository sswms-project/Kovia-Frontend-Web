import type { ReactNode } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface WorkspaceInspectorDrawerProps {
  readonly onOpenChange: (open: boolean) => void
  readonly children: ReactNode
}

export function WorkspaceInspectorDrawer({
  onOpenChange,
  children,
}: WorkspaceInspectorDrawerProps) {
  return (
    <Drawer open onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-dvh w-full max-w-md overscroll-contain">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Chi tiết đối tượng</DrawerTitle>
          <DrawerDescription>Xem và chỉnh sửa đối tượng đang chọn.</DrawerDescription>
        </DrawerHeader>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
