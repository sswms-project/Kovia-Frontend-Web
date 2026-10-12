import { Check, X } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  getTodayInputValue,
  type AiDraftQuantitiesForm,
} from '../../schemas/ai-draft-quantities.schema'
import type { AiActionDetail } from '../../types/ai-assistant.types'

/** Chỉnh số lượng của bản nháp đang mở; form do AiAssistantPanel giữ và truyền xuống. */
export interface AiDraftQuantityEdit {
  readonly editingDraftId: string | null
  readonly form: UseFormReturn<AiDraftQuantitiesForm>
  readonly isSaving: boolean
  readonly onStart: (draftId: string, values: AiDraftQuantitiesForm) => void
  readonly onCancel: () => void
  readonly onSubmit: () => void
}

interface AiDraftQuantityEditorProps {
  readonly draftId: string
  /** Các dòng hàng sửa được, theo đúng thứ tự đã nạp vào form. */
  readonly lines: readonly AiActionDetail[]
  readonly edit: AiDraftQuantityEdit
}

/**
 * Sửa ngày dự kiến hàng về và số lượng của bản nháp. Hệ thống đề xuất số lượng tối thiểu để đủ ngưỡng; người dùng thường muốn nhập nhiều hơn (tròn thùng,
 * tròn xe). Chỉ sửa số lượng — thêm bớt mặt hàng phải làm trên yêu cầu nhập sau khi xác nhận.
 */
export function AiDraftQuantityEditor({ draftId, lines, edit }: AiDraftQuantityEditorProps) {
  const {
    register,
    formState: { errors },
  } = edit.form
  const dateInputId = `ai-draft-${draftId}-expected-date`

  return (
    <form
      className="animate-in fade-in-0 animation-duration-200 mt-2 flex flex-col gap-2 motion-reduce:animate-none"
      aria-label="Chỉnh số lượng bản nháp"
      // Lỗi hiển thị bằng thông báo của schema ngay dưới ô nhập, không dùng bong bóng mặc định của trình duyệt.
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        edit.onSubmit()
      }}
    >
      <Field data-invalid={Boolean(errors.expectedDate)}>
        <FieldLabel htmlFor={dateInputId} className="text-xs font-normal">
          Ngày dự kiến hàng về
          <span className="text-destructive" aria-hidden="true">
            {' '}
            *
          </span>
        </FieldLabel>
        <Input
          id={dateInputId}
          type="date"
          min={getTodayInputValue()}
          required
          disabled={edit.isSaving}
          aria-invalid={Boolean(errors.expectedDate)}
          className="h-8"
          {...register('expectedDate')}
        />
        <FieldError>{errors.expectedDate?.message}</FieldError>
      </Field>
      {lines.map((line, index) => {
        const inputId = `ai-draft-${draftId}-quantity-${index}`
        const error = errors.lines?.[index]?.quantity
        return (
          <Field key={line.productId ?? index} data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={inputId} className="text-xs font-normal break-words">
              {line.label}
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={inputId}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                disabled={edit.isSaving}
                aria-invalid={Boolean(error)}
                className="h-8 tabular-nums"
                {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
              />
              {line.unit ? (
                <span className="text-muted-foreground shrink-0 text-xs">{line.unit}</span>
              ) : null}
            </div>
            <FieldError>{error?.message}</FieldError>
          </Field>
        )
      })}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={edit.isSaving}
          onClick={edit.onCancel}
        >
          <X aria-hidden="true" />
          Bỏ
        </Button>
        <Button type="submit" size="sm" disabled={edit.isSaving}>
          {edit.isSaving ? <Spinner /> : <Check aria-hidden="true" />}
          Lưu số lượng
        </Button>
      </div>
    </form>
  )
}
