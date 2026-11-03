import { ClipboardCheck } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface PermissionTemplateButtonProps {
  readonly roleLabel: string
  readonly addedCount: number
  readonly removedCount: number
  readonly disabled: boolean
  readonly onApply: () => void
}

export function PermissionTemplateButton({
  roleLabel,
  addedCount,
  removedCount,
  disabled,
  onApply,
}: PermissionTemplateButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <ClipboardCheck aria-hidden="true" />
          Dùng mẫu đề xuất
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Dùng mẫu quyền {roleLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Thay lựa chọn đang chỉnh bằng mẫu đề xuất: thêm {addedCount} quyền, bỏ {removedCount}{' '}
            quyền. Bạn có thể kiểm tra và chỉnh lại danh sách trước khi bấm “Lưu thay đổi”. Quyền
            riêng đã cấp theo nhân sự vẫn được giữ nguyên.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại</AlertDialogCancel>
          <AlertDialogAction disabled={disabled} onClick={onApply}>
            Chọn mẫu, chưa lưu
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
