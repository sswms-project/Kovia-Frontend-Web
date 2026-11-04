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
  readonly unavailablePermissions: readonly string[]
  readonly onApply: () => void
}

export function PermissionTemplateButton({
  roleLabel,
  addedCount,
  removedCount,
  disabled,
  unavailablePermissions,
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
          {unavailablePermissions.length > 0 && (
            <div className="text-destructive max-h-40 overflow-auto text-sm" role="status">
              <p>
                Mẫu chưa đầy đủ: {unavailablePermissions.length} quyền chưa thể cấp trong phạm vi
                hiện tại.
              </p>
              <ul className="list-inside list-disc">
                {unavailablePermissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
              <p>Liên hệ quản trị hệ thống để kiểm tra phạm vi phân quyền trước khi áp dụng.</p>
            </div>
          )}
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
