import { Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormActionsProps {
  readonly isPending: boolean
  readonly autoApprove: boolean
  readonly isApprovedEdit?: boolean
  readonly onSaveDraft: () => void
  readonly onSaveAndSubmit?: () => void
}

export function FormActions({
  isPending,
  autoApprove,
  isApprovedEdit,
  onSaveDraft,
  onSaveAndSubmit,
}: FormActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant={autoApprove ? 'default' : 'outline'}
        disabled={isPending}
        onClick={onSaveDraft}
      >
        <Save aria-hidden="true" />
        {isApprovedEdit ? 'Lưu thay đổi' : autoApprove ? 'Tạo' : 'Lưu nháp'}
      </Button>
      {!autoApprove && !isApprovedEdit ? (
        <Button
          type={onSaveAndSubmit ? 'button' : 'submit'}
          disabled={isPending}
          onClick={onSaveAndSubmit}
        >
          <Send aria-hidden="true" />
          Lưu và gửi duyệt
        </Button>
      ) : null}
    </div>
  )
}
