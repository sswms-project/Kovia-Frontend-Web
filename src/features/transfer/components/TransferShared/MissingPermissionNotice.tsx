import { ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Báo rõ vì sao màn thao tác chỉ xem được, thay vì để người dùng tự đoán nút đang ở đâu. */
export function MissingPermissionNotice({ action }: { readonly action: string }) {
  return (
    <Alert>
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>Tài khoản chưa có quyền {action}</AlertTitle>
      <AlertDescription>
        Bạn chỉ xem được đợt này. Nhờ chủ doanh nghiệp cấp quyền trong mục Phân quyền để thao tác.
      </AlertDescription>
    </Alert>
  )
}
