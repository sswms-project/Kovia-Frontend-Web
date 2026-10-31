'use client'

import { LoaderCircle, RefreshCw, UserCheck, UserMinus, UsersRound } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AssignWarehouseTaskFormValues } from '../../schemas/inbound.schema'
import type { AssignableWarehouseStaff } from '../../types/inbound.types'

export interface AssignWarehouseTaskTarget {
  readonly kind:
    | 'Receiving'
    | 'PutAway'
    | 'TransferPick'
    | 'TransferReceive'
    | 'TransferPutAway'
    | 'StockIssuePick'
    | 'CustomerReturnReceive'
    | 'SupplierReturnDispatch'
  readonly id: string
  readonly referenceCode: string
  readonly warehouseId: string
  readonly warehouseName: string
  readonly currentAssigneeId: string | null
  readonly currentAssigneeName: string | null
  readonly currentPriority: 'Normal' | 'Urgent'
  readonly currentDueAt: string | null
}

type AssignmentStaff = Pick<AssignableWarehouseStaff, 'id' | 'fullName' | 'email'> &
  Partial<Omit<AssignableWarehouseStaff, 'id' | 'fullName' | 'email'>>

interface AssignWarehouseTaskDialogProps {
  readonly title?: string
  readonly lockSelection?: boolean
  readonly submitDisabled?: boolean
  readonly children?: ReactNode
  readonly target: AssignWarehouseTaskTarget | null
  readonly form: UseFormReturn<AssignWarehouseTaskFormValues>
  readonly staff: readonly AssignmentStaff[]
  readonly isLoadingStaff: boolean
  readonly isErrorStaff: boolean
  readonly isFetchingStaff: boolean
  readonly onRetryStaff: () => void
  readonly isUncertain?: boolean
  readonly onResolve?: () => void
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: () => void
  readonly onUnassign?: () => void
}

const TASK_LABELS = {
  Receiving: 'nhận hàng',
  PutAway: 'cất hàng',
  TransferPick: 'lấy hàng',
  TransferReceive: 'nhận hàng',
  TransferPutAway: 'cất hàng',
  StockIssuePick: 'lấy hàng',
  CustomerReturnReceive: 'nhận hàng khách trả',
  SupplierReturnDispatch: 'giao trả nhà cung cấp',
} as const

export function AssignWarehouseTaskDialog({
  title,
  target,
  form,
  staff,
  isLoadingStaff,
  isErrorStaff,
  isFetchingStaff,
  onRetryStaff,
  isPending,
  isUncertain = false,
  onResolve,
  onOpenChange,
  onSubmit,
  onUnassign,
  children,
  lockSelection = false,
  submitDisabled = false,
}: AssignWarehouseTaskDialogProps) {
  const {
    control,
    register,
    formState: { errors },
  } = form
  const isBusy = isPending || isUncertain
  const isReassignment = Boolean(target?.currentAssigneeId)
  const isTransfer = Boolean(target?.kind.startsWith('Transfer'))
  const isReturn =
    target?.kind === 'CustomerReturnReceive' || target?.kind === 'SupplierReturnDispatch'
  const isStockIssue = target?.kind === 'StockIssuePick'
  const taskLabel = target ? TASK_LABELS[target.kind] : ''
  const canUnassign = Boolean(onUnassign) && isReassignment && target?.kind === 'Receiving'
  const hasOtherStaff = staff.some(
    (person) => isTransfer || isStockIssue || isReturn || person.id !== target?.currentAssigneeId
  )

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !isBusy && onOpenChange(open)}>
      <DialogContent className="sm:max-w-lg">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>
                {title ??
                  (isReassignment ? `Giao lại việc ${taskLabel}` : `Giao việc ${taskLabel}`)}
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono font-medium" translate="no">
                  {target.referenceCode}
                </span>{' '}
                · {target.warehouseName}
                {isReassignment && target.currentAssigneeName
                  ? ` · Đang giao cho ${target.currentAssigneeName}`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <Field data-invalid={Boolean(errors.staffId)}>
              <FieldLabel>Nhân viên kho nhận việc</FieldLabel>
              <FieldDescription>
                {isStockIssue
                  ? 'Chọn người đang hoạt động và được phân công tại kho này. Hệ thống kiểm tra quyền và giữ tồn đủ điều kiện khi giao việc.'
                  : 'Chỉ hiển thị nhân viên đang hoạt động, thuộc kho và đủ quyền nhận việc. Người có điểm tải thấp (ít việc còn phải làm) được xếp trước.'}
              </FieldDescription>
              {isLoadingStaff ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : isErrorStaff ? (
                <div className="flex flex-col items-start gap-2 border p-3 text-sm">
                  <span>Không thể tải danh sách nhân viên của kho.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFetchingStaff}
                    onClick={onRetryStaff}
                  >
                    <RefreshCw
                      className={isFetchingStaff ? 'animate-spin' : undefined}
                      aria-hidden="true"
                    />
                    Thử lại
                  </Button>
                </div>
              ) : staff.length === 0 ? (
                <div className="text-muted-foreground flex items-start gap-3 border border-dashed p-3 text-sm">
                  <UsersRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Kho này chưa có Nhân viên kho đang hoạt động. Hãy phân công nhân viên vào kho
                    tại Danh bạ nhân sự trước khi giao việc.
                  </span>
                </div>
              ) : isReassignment && !hasOtherStaff ? (
                <div className="text-muted-foreground flex items-start gap-3 border border-dashed p-3 text-sm">
                  <UsersRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Kho này chưa có Nhân viên kho nào khác để giao lại.
                    {canUnassign
                      ? ' Bạn có thể hủy giao việc, hoặc phân công thêm nhân viên vào kho tại Danh bạ nhân sự.'
                      : ' Hãy phân công thêm nhân viên vào kho tại Danh bạ nhân sự.'}
                  </span>
                </div>
              ) : (
                <Controller
                  control={control}
                  name="staffId"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-label="Nhân viên kho nhận việc"
                      data-scrollbar="slim"
                      className="max-h-72 gap-1.5 overflow-y-auto"
                      disabled={isBusy || lockSelection}
                    >
                      {staff.map((person) => (
                        <StaffOption
                          key={person.id}
                          person={person}
                          isCurrent={person.id === target.currentAssigneeId}
                          isSelected={field.value === person.id}
                          disabled={
                            isBusy ||
                            lockSelection ||
                            (!isTransfer &&
                              !isStockIssue &&
                              !isReturn &&
                              person.id === target.currentAssigneeId)
                          }
                        />
                      ))}
                    </RadioGroup>
                  )}
                />
              )}
              <FieldError>{errors.staffId?.message}</FieldError>
            </Field>

            {!isStockIssue && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.priority)}>
                  <FieldLabel htmlFor="assign-task-priority">Mức ưu tiên</FieldLabel>
                  <NativeSelect
                    id="assign-task-priority"
                    disabled={isBusy || lockSelection}
                    {...register('priority')}
                  >
                    <NativeSelectOption value="Normal">Bình thường</NativeSelectOption>
                    <NativeSelectOption value="Urgent">Khẩn</NativeSelectOption>
                  </NativeSelect>
                  <FieldError>{errors.priority?.message}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.dueAt)}>
                  <FieldLabel htmlFor="assign-task-due-at">Hạn hoàn thành</FieldLabel>
                  <Input
                    id="assign-task-due-at"
                    type="datetime-local"
                    disabled={isBusy || lockSelection}
                    {...register('dueAt')}
                  />
                  <FieldError>{errors.dueAt?.message}</FieldError>
                </Field>
              </div>
            )}

            {!isStockIssue && (isReassignment || isTransfer) && (
              <Field data-invalid={Boolean(errors.reason)}>
                <FieldLabel htmlFor="assign-task-reason">
                  {canUnassign
                    ? 'Lý do giao lại hoặc hủy giao'
                    : isTransfer
                      ? isReassignment
                        ? 'Lý do đổi người nhận việc (nếu có)'
                        : 'Ghi chú giao việc (nếu có)'
                      : 'Lý do giao lại'}
                </FieldLabel>
                <Textarea
                  id="assign-task-reason"
                  rows={3}
                  disabled={isBusy}
                  maxLength={500}
                  placeholder="Ví dụ: nhân viên nghỉ phép, cân bằng khối lượng công việc…"
                  aria-invalid={Boolean(errors.reason)}
                  {...register('reason')}
                />
                <FieldDescription>
                  {canUnassign
                    ? 'Lý do được ghi vào nhật ký hoạt động và gửi thông báo cho nhân viên đang được giao.'
                    : isReassignment
                      ? 'Lý do được ghi vào nhật ký hoạt động và gửi thông báo cho cả hai nhân viên.'
                      : 'Ghi chú được ghi cùng lần giao công việc.'}
                </FieldDescription>
                <FieldError>{errors.reason?.message}</FieldError>
              </Field>
            )}

            {children}
            {isUncertain && (
              <Alert>
                <AlertDescription className="flex flex-col items-start gap-2">
                  <p>
                    Chưa xác định kết quả phân công. Không đổi nội dung cho đến khi kiểm tra xong.
                  </p>
                  <Button type="button" variant="outline" disabled={isPending} onClick={onResolve}>
                    Kiểm tra lại kết quả
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              {canUnassign ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  disabled={isBusy}
                  onClick={onUnassign}
                >
                  <UserMinus aria-hidden="true" />
                  Hủy giao việc
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button
                type="button"
                disabled={
                  isBusy || isLoadingStaff || isErrorStaff || !hasOtherStaff || submitDisabled
                }
                onClick={onSubmit}
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <UserCheck aria-hidden="true" />
                )}
                {isTransfer ? 'Lưu giao việc' : isReassignment ? 'Giao lại' : 'Giao việc'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StaffOption({
  person,
  isCurrent,
  isSelected,
  disabled,
}: {
  readonly person: AssignmentStaff
  readonly isCurrent: boolean
  readonly isSelected: boolean
  readonly disabled: boolean
}) {
  const inputId = `assign-staff-${person.id}`
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-center gap-3 border p-3 transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <RadioGroupItem id={inputId} value={person.id} disabled={disabled} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{person.fullName}</span>
        <span className="text-muted-foreground block truncate text-xs">{person.email}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
        {isCurrent ? (
          <Badge variant="secondary">Đang được giao</Badge>
        ) : person.isRecommended ? (
          <Badge>Đề xuất</Badge>
        ) : person.hasTaskInProgress ? (
          <Badge variant="outline">Đang làm việc khác</Badge>
        ) : null}
        {person.workloadScore !== undefined ? (
          <span className="font-medium tabular-nums">
            Điểm tải {person.workloadScore.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
          </span>
        ) : null}
        <span className="text-muted-foreground tabular-nums">{describeOpenTasks(person)}</span>
      </span>
    </label>
  )
}

function describeOpenTasks(person: AssignmentStaff) {
  const parts = [
    person.openReceivingTasks === undefined ? null : `${person.openReceivingTasks} nhận`,
    person.openPutAwayTasks === undefined ? null : `${person.openPutAwayTasks} cất`,
  ].filter((part) => part !== null)
  const optionalCounts = [
    [person.openPickingTasks, 'lấy'],
    [person.openWarehouseTasks, 'việc kho'],
    [person.openCycleCounts, 'kiểm kê'],
  ] as const
  for (const [count, label] of optionalCounts) {
    if (count) parts.push(`${count} ${label}`)
  }
  return parts.join(' · ')
}
