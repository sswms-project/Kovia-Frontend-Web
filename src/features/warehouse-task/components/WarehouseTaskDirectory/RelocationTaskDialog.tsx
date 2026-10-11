import type { UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { StaffResponse } from '@/features/staff/types/staff.types'
import type { ExecuteWarehouseRelocationFormValues } from '../../schemas/warehouse-relocation.schema'
import type {
  WarehousePlacementRecommendation,
  WarehouseTaskDetail,
} from '../../types/warehouse-task.types'

interface RelocationTaskDialogProps {
  readonly open: boolean
  readonly detail?: WarehouseTaskDetail
  readonly isLoading: boolean
  readonly isError: boolean
  readonly scope: 'mine' | 'managed'
  readonly canAssign: boolean
  readonly canExecute: boolean
  readonly canOverrideDestination: boolean
  readonly staffOptions: readonly StaffResponse[]
  readonly assignmentStaffId: string
  readonly assignmentReason: string
  readonly recommendations: readonly WarehousePlacementRecommendation[]
  readonly recommendationsLoading: boolean
  readonly executeForm: UseFormReturn<ExecuteWarehouseRelocationFormValues>
  readonly isAssigning: boolean
  readonly isExecuting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onRetry: () => void
  readonly onAssignmentStaffChange: (staffId: string) => void
  readonly onAssignmentReasonChange: (reason: string) => void
  readonly onAssign: () => void
  readonly onLineChange: (lineId: string) => void
  readonly onExecute: (values: ExecuteWarehouseRelocationFormValues) => void
}

export function RelocationTaskDialog(props: RelocationTaskDialogProps) {
  const detail = props.detail
  const selectedLineId = props.executeForm.watch('lineId')
  const selectedLine = detail?.lines.find((line) => line.id === selectedLineId)
  const selectedDestination = props.executeForm.watch('destinationSlotId')
  const selectedRecommendation = props.recommendations.find(
    (item) => item.slotId === selectedDestination
  )
  const assignedDestinationId =
    selectedLine?.proposedDestinationSlotId ?? props.recommendations[0]?.slotId
  const assignedRecommendation = props.recommendations.find(
    (item) => item.slotId === assignedDestinationId
  )
  const errors = props.executeForm.formState.errors

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết công việc điều chuyển vị trí</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.taskCode} · ${detail.warehouseName}`
              : 'Kiểm tra nguồn hàng, người phụ trách và vị trí đích trước khi thực hiện.'}
          </DialogDescription>
        </DialogHeader>

        {props.isLoading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Đang tải công việc…</p>
        ) : props.isError || !detail ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-destructive text-sm">Không thể tải chi tiết công việc.</p>
            <Button type="button" variant="outline" onClick={props.onRetry}>
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 border p-3 sm:grid-cols-4">
              <Summary label="Trạng thái" value={detail.executionStatus} />
              <Summary
                label="Ưu tiên"
                value={detail.priority === 'Urgent' ? 'Khẩn' : 'Bình thường'}
              />
              <Summary label="Người phụ trách" value={detail.assignedToName ?? 'Chưa giao'} />
              <Summary label="Hạn hoàn thành" value={formatDate(detail.dueAt)} />
              <div className="sm:col-span-4">
                <p className="text-muted-foreground text-xs">Lý do</p>
                <p className="text-sm">{detail.reason}</p>
              </div>
            </div>

            {props.canAssign && props.scope === 'managed' ? (
              <section className="space-y-3 border p-3">
                <div>
                  <h3 className="font-medium">Phân công công việc</h3>
                  <p className="text-muted-foreground text-sm">
                    Chỉ nhân sự đang hoạt động và được gán vào kho này mới có thể nhận task.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_2fr_auto]">
                  <Field>
                    <FieldLabel htmlFor="relocation-assignee">Người phụ trách</FieldLabel>
                    <NativeSelect
                      id="relocation-assignee"
                      value={props.assignmentStaffId}
                      onChange={(event) => props.onAssignmentStaffChange(event.target.value)}
                    >
                      <NativeSelectOption value="">Chọn nhân sự</NativeSelectOption>
                      {props.staffOptions.map((staff) => (
                        <NativeSelectOption key={staff.id} value={staff.id}>
                          {staff.fullName} · {staff.role ?? 'Nhân viên'}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="relocation-assignment-reason">
                      Lý do phân công lại
                    </FieldLabel>
                    <Input
                      id="relocation-assignment-reason"
                      maxLength={500}
                      value={props.assignmentReason}
                      onChange={(event) => props.onAssignmentReasonChange(event.target.value)}
                    />
                  </Field>
                  <Button
                    type="button"
                    className="self-end"
                    disabled={!props.assignmentStaffId || props.isAssigning}
                    onClick={props.onAssign}
                  >
                    {props.isAssigning
                      ? 'Đang giao…'
                      : detail.assignedTo
                        ? 'Giao lại'
                        : 'Phân công'}
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div>
                <h3 className="font-medium">Dòng điều chuyển</h3>
                <p className="text-muted-foreground text-sm">
                  Số lượng tồn toàn kho không đổi; hệ thống chỉ chuyển giữa hai vị trí.
                </p>
              </div>
              <div className="space-y-2">
                {detail.lines.map((line) => (
                  <button
                    type="button"
                    key={line.id}
                    className="enabled:hover:bg-muted flex w-full items-center justify-between gap-3 border p-3 text-left disabled:cursor-default"
                    disabled={!props.canExecute}
                    onClick={() => props.onLineChange(line.id)}
                  >
                    <span>
                      <span className="block font-medium">
                        {line.sku} · {line.productName}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {line.sourceSlotCode} →{' '}
                        {line.proposedDestinationSlotCode ?? 'Hệ thống gợi ý'}
                      </span>
                    </span>
                    <Badge variant={line.remainingQuantity > 0 ? 'secondary' : 'outline'}>
                      Còn {line.remainingQuantity}/{line.quantity}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>

            {detail.executions.length > 0 ? (
              <section className="space-y-3 border p-3">
                <div>
                  <h3 className="font-medium">Lịch sử đã điều chuyển</h3>
                  <p className="text-muted-foreground text-sm">
                    Mỗi lần xác nhận được lưu cùng vị trí thực tế và thứ hạng gợi ý tại thời điểm
                    làm.
                  </p>
                </div>
                <div className="space-y-2">
                  {detail.executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="grid gap-2 border p-3 text-sm sm:grid-cols-4"
                    >
                      <Summary
                        label="Vị trí"
                        value={`${execution.sourceSlotCode} → ${execution.destinationSlotCode}`}
                      />
                      <Summary label="Số lượng" value={String(execution.quantity)} />
                      <Summary
                        label="Gợi ý"
                        value={
                          execution.recommendationRank
                            ? `#${execution.recommendationRank} · ${execution.recommendationScore ?? 0} điểm`
                            : 'Chọn thủ công'
                        }
                      />
                      <Summary label="Thời điểm" value={formatDate(execution.executedAt)} />
                      {execution.overrideReason ? (
                        <div className="sm:col-span-4">
                          <p className="text-muted-foreground text-xs">Lý do chọn khác</p>
                          <p>{execution.overrideReason}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {props.canExecute && selectedLine?.remainingQuantity ? (
              <form
                className="space-y-4 border p-3"
                onSubmit={props.executeForm.handleSubmit(props.onExecute)}
              >
                <div>
                  <h3 className="font-medium">Ghi nhận điều chuyển</h3>
                  <p className="text-muted-foreground text-sm">
                    {props.canOverrideDestination
                      ? 'Quản lý có thể chọn vị trí khác và phải ghi rõ lý do.'
                      : 'Thực hiện đúng vị trí do quản lý hoặc hệ thống chỉ định.'}
                  </p>
                </div>
                {detail.executionStatus !== 'InProgress' ? (
                  <p className="text-muted-foreground bg-muted p-3 text-sm">
                    Hãy bắt đầu công việc trước khi ghi nhận số lượng đã chuyển.
                  </p>
                ) : null}
                <Field data-invalid={Boolean(errors.quantity)}>
                  <FieldLabel htmlFor="relocation-execute-quantity">Số lượng thực hiện</FieldLabel>
                  <Input
                    id="relocation-execute-quantity"
                    type="number"
                    min="0.01"
                    max={selectedLine.remainingQuantity}
                    step="0.01"
                    {...props.executeForm.register('quantity', { valueAsNumber: true })}
                  />
                  <FieldError errors={[errors.quantity]} />
                </Field>
                <Field data-invalid={Boolean(errors.destinationSlotId)}>
                  <FieldLabel>Vị trí đích được xếp hạng</FieldLabel>
                  {props.recommendationsLoading ? (
                    <p className="text-muted-foreground text-sm">Đang tính sức chứa và xếp hạng…</p>
                  ) : props.recommendations.length === 0 ? (
                    <p className="text-destructive text-sm">
                      Chưa có vị trí phù hợp. Quản lý cần cấu hình sức chứa hoặc vị trí đích.
                    </p>
                  ) : props.canOverrideDestination ? (
                    <RadioGroup
                      value={selectedDestination}
                      className="max-h-64 overflow-y-auto"
                      onValueChange={(value) =>
                        props.executeForm.setValue('destinationSlotId', value, {
                          shouldValidate: true,
                        })
                      }
                    >
                      {props.recommendations.map((recommendation) => (
                        <label
                          key={recommendation.slotId}
                          className="hover:bg-muted flex cursor-pointer gap-3 border p-3"
                        >
                          <RadioGroupItem value={recommendation.slotId} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                #{recommendation.rank} · {recommendation.slotCode}
                              </span>
                              <Badge variant="outline">{recommendation.score} điểm</Badge>
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {recommendation.zoneCode} / {recommendation.rackCode}
                            </span>
                            <span className="mt-1 block text-sm">
                              {recommendation.reasons.join(' ')}
                            </span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  ) : assignedDestinationId ? (
                    <div className="bg-muted/40 border p-3" data-testid="assigned-destination">
                      <p className="font-medium">
                        {selectedLine.proposedDestinationSlotCode ??
                          assignedRecommendation?.slotCode}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {selectedLine.proposedDestinationSlotId
                          ? 'Vị trí do quản lý chỉ định.'
                          : 'Vị trí xếp hạng 1 do hệ thống đề xuất.'}
                      </p>
                      {assignedRecommendation ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {assignedRecommendation.zoneCode} / {assignedRecommendation.rackCode} ·{' '}
                          {assignedRecommendation.reasons.join(' ')}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-destructive text-sm">
                      Chưa xác định được vị trí được giao. Vui lòng liên hệ quản lý kho.
                    </p>
                  )}
                  <FieldError errors={[errors.destinationSlotId]} />
                </Field>
                {props.canOverrideDestination &&
                selectedRecommendation?.rank !== 1 &&
                selectedDestination !== selectedLine.proposedDestinationSlotId ? (
                  <Field data-invalid={Boolean(errors.overrideReason)}>
                    <FieldLabel htmlFor="relocation-override-reason">
                      Lý do chọn vị trí khác
                    </FieldLabel>
                    <Textarea
                      id="relocation-override-reason"
                      maxLength={500}
                      {...props.executeForm.register('overrideReason')}
                    />
                    <FieldError errors={[errors.overrideReason]} />
                  </Field>
                ) : null}
                <Button
                  type="submit"
                  disabled={
                    detail.executionStatus !== 'InProgress' ||
                    props.recommendations.length === 0 ||
                    props.isExecuting
                  }
                >
                  {props.isExecuting ? 'Đang ghi nhận…' : 'Xác nhận đã điều chuyển'}
                </Button>
              </form>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Summary({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Không đặt'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value)
  )
}
