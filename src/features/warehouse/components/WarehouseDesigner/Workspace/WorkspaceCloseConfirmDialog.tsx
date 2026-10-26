import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface WorkspaceCloseConfirmDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}

export function WorkspaceCloseConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: WorkspaceCloseConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ thay đổi chưa lưu?</AlertDialogTitle>
          <AlertDialogDescription>
            Các thay đổi trên sơ đồ sẽ bị mất nếu bạn đóng trang ngay bây giờ.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Đóng và bỏ thay đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
