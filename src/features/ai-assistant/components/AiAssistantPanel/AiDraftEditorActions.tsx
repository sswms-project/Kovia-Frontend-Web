import { Eye, Undo2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { AI_FORM_TOUCH_BUTTON } from '../../utils/ai-form-touch-classes'

interface AiDraftEditorActionsProps {
  readonly isSaving: boolean
  readonly isDiscardOpen: boolean
  readonly onDiscard: () => void
  readonly onDiscardOpenChange: (isOpen: boolean) => void
  readonly onConfirmDiscard: () => void
  readonly onSave: () => void
}

/** Bỏ thay đổi asks first (the caller opens the dialog only when something changed); Xem trước saves. */
export function AiDraftEditorActions({
  isSaving,
  isDiscardOpen,
  onDiscard,
  onDiscardOpenChange,
  onConfirmDiscard,
  onSave,
}: AiDraftEditorActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(AI_FORM_TOUCH_BUTTON, 'aria-disabled:opacity-50')}
        aria-disabled={isSaving}
        onClick={() => {
          if (!isSaving) onDiscard()
        }}
      >
        <Undo2 aria-hidden="true" />
        Bỏ thay đổi
      </Button>
      {/* aria-disabled, not disabled: the button that was pressed keeps keyboard focus while it saves. */}
      <Button
        type="button"
        size="sm"
        className={cn(AI_FORM_TOUCH_BUTTON, 'aria-disabled:opacity-50')}
        aria-disabled={isSaving}
        aria-busy={isSaving}
        onClick={() => {
          if (!isSaving) onSave()
        }}
      >
        {isSaving ? <Spinner /> : <Eye aria-hidden="true" />}
        Xem trước
      </Button>

      <AlertDialog open={isDiscardOpen} onOpenChange={onDiscardOpenChange}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ các thay đổi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>
              Bản nháp sẽ giữ nội dung đã lưu gần nhất. Những gì bạn vừa sửa sẽ mất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={AI_FORM_TOUCH_BUTTON}>
              Tiếp tục chỉnh sửa
            </AlertDialogCancel>
            <AlertDialogAction className={AI_FORM_TOUCH_BUTTON} onClick={onConfirmDiscard}>
              Bỏ thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
