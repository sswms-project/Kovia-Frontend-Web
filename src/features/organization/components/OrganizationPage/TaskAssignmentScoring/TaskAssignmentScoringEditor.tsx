'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, RotateCcw, Save, Undo2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
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
import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
import {
  taskAssignmentScoringFormSchema,
  type TaskAssignmentScoringFormInput,
  type TaskAssignmentScoringFormValues,
} from '../../../schemas/task-assignment-scoring.schema'
import type { TaskAssignmentScoringResponse } from '../../../types/organization.types'
import { BASE_SCORE_FIELDS, VOLUME_FIELDS } from './scoring-fields'
import { ScoringFormulaExplainer } from './ScoringFormulaExplainer'
import { ScoringWeightField } from './ScoringWeightField'
import type { ScoringFieldErrors } from './types'

interface TaskAssignmentScoringEditorProps {
  readonly scoring: TaskAssignmentScoringResponse
  readonly canUpdate: boolean
  readonly isSaving: boolean
  readonly isResetting: boolean
  /** Khóa chỉnh sửa khi phiên bản đang xem đã cũ, chờ người dùng tải lại. */
  readonly isLocked: boolean
  /** Trả về lỗi theo từng ô khi Backend từ chối giá trị; rỗng khi đã lưu hoặc lỗi chung. */
  readonly onSave: (values: TaskAssignmentScoringFormValues) => Promise<ScoringFieldErrors>
  readonly onReset: () => void
}

// Section gắn lại component này theo phiên bản, nên giá trị ban đầu của form luôn khớp phiên bản gửi đi khi lưu.
export function TaskAssignmentScoringEditor({
  scoring,
  canUpdate,
  isSaving,
  isResetting,
  isLocked,
  onSave,
  onReset,
}: TaskAssignmentScoringEditorProps) {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const form = useForm<TaskAssignmentScoringFormInput, unknown, TaskAssignmentScoringFormValues>({
    resolver: zodResolver(taskAssignmentScoringFormSchema),
    defaultValues: scoring.weights,
    mode: 'onChange',
  })
  const watchedValues = useWatch({ control: form.control })
  const preview = taskAssignmentScoringFormSchema.safeParse(watchedValues)
  const isBusy = isSaving || isResetting || isLocked

  const submit = form.handleSubmit(async (values) => {
    const fieldErrors = await onSave(values)
    for (const [field, message] of Object.entries(fieldErrors)) {
      form.setError(field as keyof TaskAssignmentScoringFormValues, { type: 'server', message })
    }
  })

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <ScoringFormulaExplainer weights={preview.success ? preview.data : null} />

      <FieldSet>
        <FieldLegend variant="label">Điểm nền theo loại việc</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          {BASE_SCORE_FIELDS.map((definition) => (
            <ScoringWeightField
              key={definition.key}
              definition={definition}
              defaultValue={scoring.defaults[definition.key]}
              form={form}
              disabled={!canUpdate || isBusy}
            />
          ))}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Khối lượng và mức ưu tiên</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          {VOLUME_FIELDS.map((definition) => (
            <ScoringWeightField
              key={definition.key}
              definition={definition}
              defaultValue={scoring.defaults[definition.key]}
              form={form}
              disabled={!canUpdate || isBusy}
            />
          ))}
        </FieldGroup>
      </FieldSet>

      {canUpdate ? (
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
          {scoring.isCustomized ? (
            <Button
              type="button"
              variant="outline"
              className="sm:mr-auto"
              disabled={isBusy}
              onClick={() => setIsResetConfirmOpen(true)}
            >
              {isResetting ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              Khôi phục mặc định
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy || !form.formState.isDirty}
            onClick={() => form.reset(scoring.weights)}
          >
            <Undo2 aria-hidden="true" />
            Hủy thay đổi
          </Button>
          <Button type="submit" disabled={isBusy || !form.formState.isDirty}>
            {isSaving ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Lưu hệ số
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground border-t pt-4 text-xs">
          Bạn chỉ có quyền xem. Cần quyền cập nhật doanh nghiệp để chỉnh hệ số.
        </p>
      )}

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục hệ số mặc định?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ số riêng của doanh nghiệp sẽ bị bỏ. Danh sách nhân viên đề xuất sẽ tính lại theo hệ
              số mặc định của hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ hệ số hiện tại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsResetConfirmOpen(false)
                onReset()
              }}
            >
              Khôi phục mặc định
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
