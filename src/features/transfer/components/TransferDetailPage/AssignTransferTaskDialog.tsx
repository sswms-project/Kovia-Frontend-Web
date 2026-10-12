import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'

export interface AssignableStaffOption {
  readonly id: string
  readonly name: string
}

export interface AssignTransferTaskTarget {
  readonly title: string
  readonly description: string
  readonly currentAssigneeId: string | null
  readonly currentAssigneeName: string | null
}

interface AssignTransferTaskDialogProps {
  readonly target: AssignTransferTaskTarget | null
  readonly staff: readonly AssignableStaffOption[]
  readonly isLoadingStaff: boolean
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (request: { staffId: string; reason: string | null }) => void
}

type AssignTransferTaskFormProps = Omit<AssignTransferTaskDialogProps, 'target'> & {
  readonly target: AssignTransferTaskTarget
}

/** Chọn nhân viên nhận việc lấy/nhận hàng; giao lại phải kèm lý do như các loại công việc kho khác. */
export function AssignTransferTaskDialog({ target, ...rest }: AssignTransferTaskDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => !rest.isPending && rest.onOpenChange(open)}
    >
      <DialogContent size="lg" className="sm:max-w-lg">
        {target ? <AssignTransferTaskForm target={target} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  )
}

// Form chỉ gắn khi hộp thoại mở nên mỗi lần mở là một lần nhập mới, không giữ lại người vừa chọn lần trước.
function AssignTransferTaskForm({
  target,
  staff,
  isLoadingStaff,
  isPending,
  onOpenChange,
  onSubmit,
}: AssignTransferTaskFormProps) {
  const [staffId, setStaffId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const isReassignment = Boolean(target.currentAssigneeId)

  function submit() {
    if (!staffId) return setError('Hãy chọn nhân viên nhận việc.')
    if (staffId === target.currentAssigneeId)
      return setError('Nhân viên này đang được giao việc. Hãy chọn người khác.')
    if (isReassignment && !reason.trim()) return setError('Vui lòng nhập lý do giao lại.')
    setError('')
    onSubmit({ staffId, reason: reason.trim() || null })
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{target.title}</DialogTitle>
        <DialogDescription>{target.description}</DialogDescription>
      </DialogHeader>
      {isReassignment ? (
        <p className="bg-muted rounded-md px-3 py-2 text-sm">
          Đang giao cho: <strong>{target.currentAssigneeName ?? 'nhân viên đã chọn'}</strong>. Chọn
          người khác để giao lại.
        </p>
      ) : null}
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="transfer-assign-staff">Nhân viên nhận việc</FieldLabel>
        <NativeSelect
          id="transfer-assign-staff"
          className="w-full"
          disabled={isLoadingStaff}
          value={staffId}
          onChange={(event) => {
            setStaffId(event.target.value)
            setError('')
          }}
        >
          <NativeSelectOption value="">
            {isLoadingStaff ? 'Đang tải danh sách…' : 'Chọn nhân viên'}
          </NativeSelectOption>
          {staff.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError>{error}</FieldError>
      </Field>
      {isReassignment ? (
        <Field>
          <FieldLabel htmlFor="transfer-assign-reason">Lý do giao lại</FieldLabel>
          <Textarea
            id="transfer-assign-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          Đóng
        </Button>
        <Button type="button" disabled={isPending} onClick={submit}>
          {isPending ? 'Đang giao…' : isReassignment ? 'Giao lại' : 'Giao việc'}
        </Button>
      </DialogFooter>
    </div>
  )
}
