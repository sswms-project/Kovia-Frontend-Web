'use client'

import { useImportNavigation } from '@/components/operations/use-import-navigation'
import { TransferConfirmDialog } from './TransferConfirmDialog'

/** Dùng cùng cơ chế bảo vệ Back/Forward, liên kết và unload đã kiểm thử ở workspace import. */
export function TransferUnsavedChanges({
  dirty,
  busy,
}: {
  readonly dirty: boolean
  readonly busy: boolean
}) {
  const navigation = useImportNavigation(
    dirty || busy,
    busy,
    'Vui lòng đợi thao tác hiện tại hoàn tất.'
  )
  return (
    <TransferConfirmDialog
      open={navigation.discardOpen}
      onOpenChange={(open) => {
        if (!open) navigation.cancelDiscard()
      }}
      title="Bỏ nội dung chưa lưu?"
      description={
        <p>Nội dung đang nhập chưa được lưu sẽ bị bỏ. Dữ liệu đã ghi nhận không thay đổi.</p>
      }
      confirmLabel="Rời trang"
      pendingLabel="Đang xử lý…"
      isPending={busy}
      onConfirm={navigation.confirmDiscard}
    />
  )
}
