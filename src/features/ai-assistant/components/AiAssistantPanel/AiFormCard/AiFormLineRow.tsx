import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage'
import {
  formatStockIssueQuantity,
  stockIssueQuantityStep,
} from '@/features/stock-issue/utils/stock-issue-format'
import { cn } from '@/lib/utils'
import type { AiFormLine } from '../../../schemas/ai-form-card.schema'
import {
  type AiFormLineErrors,
  exceedsAiFormLineAvailable,
  getAiFormLineBaseQuantity,
  getAiFormLineUnit,
  validateAiFormLine,
} from '../../../utils/ai-form-lines'
import {
  AI_FORM_TOUCH_COMBOBOX,
  AI_FORM_TOUCH_ICON_BUTTON,
  AI_FORM_TOUCH_INPUT,
} from '../../../utils/ai-form-touch-classes'
import { AiFormLineUnitField } from './AiFormLineUnitField'

interface AiFormLineRowProps {
  readonly id: string
  readonly index: number
  readonly line: AiFormLine
  /** Show availability and advise a shortage (documents that issue goods); false when receiving. */
  readonly showsStock?: boolean
  /** The unit is the product's base unit, shown as text (transfer, supplier return). */
  readonly baseUnitOnly?: boolean
  /** Products matching the current search; the picked one is shown from the line itself. */
  readonly options: readonly LookupOption[]
  readonly isLoadingOptions: boolean
  /** Per-field messages appear only after the user tried to continue. */
  readonly showErrors: boolean
  /** What the BE said about this row; shown at once, until the user touches the row. */
  readonly serverErrors?: AiFormLineErrors
  readonly onSearchChange: (searchText: string) => void
  /** `''` when the selection was cleared. */
  readonly onProductChange: (productId: string) => void
  readonly onQuantityChange: (quantity: string) => void
  readonly onUnitChange: (unitId: string) => void
  readonly onRemove: () => void
}

export function AiFormLineRow({
  id,
  index,
  line,
  showsStock = true,
  baseUnitOnly = false,
  options,
  isLoadingOptions,
  showErrors,
  serverErrors,
  onSearchChange,
  onProductChange,
  onQuantityChange,
  onUnitChange,
  onRemove,
}: AiFormLineRowProps) {
  const { product } = line
  const unit = getAiFormLineUnit(line)
  const errors: AiFormLineErrors = {
    ...(showErrors ? validateAiFormLine(line) : {}),
    ...serverErrors,
  }
  const factor = unit?.conversionFactor ?? 1
  const hasQuantity = line.quantity.trim() !== '' && Number(line.quantity) > 0

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={`${id}-product`}>Sản phẩm {index + 1}</FieldLabel>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn('text-muted-foreground', AI_FORM_TOUCH_ICON_BUTTON)}
          aria-label={`Xóa sản phẩm ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <Field data-invalid={Boolean(errors.product)}>
        <div className={AI_FORM_TOUCH_COMBOBOX}>
          <LookupCombobox
            id={`${id}-product`}
            value={product?.id ?? ''}
            options={options}
            selectedOption={
              product ? { value: product.id, label: `${product.sku} - ${product.name}` } : undefined
            }
            placeholder="Tìm tên, SKU hoặc mã vạch"
            emptyMessage={
              showsStock
                ? 'Kho này không có sản phẩm còn tồn khả dụng phù hợp.'
                : 'Không tìm thấy sản phẩm phù hợp.'
            }
            ariaLabel={`Sản phẩm ${index + 1}`}
            isLoading={isLoadingOptions}
            isInvalid={Boolean(errors.product)}
            onSearchChange={onSearchChange}
            onChange={onProductChange}
          />
        </div>
        <FieldError role="status">{errors.product}</FieldError>
      </Field>

      {product ? (
        <p className="text-muted-foreground text-xs break-words">
          Đơn vị cơ sở {product.baseUnitName}
          {showsStock
            ? ` · Tồn khả dụng ${formatStockIssueQuantity(product.availableQuantity)} ${product.baseUnitName}`
            : ''}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Field data-invalid={Boolean(errors.quantity)}>
          <FieldLabel htmlFor={`${id}-quantity`}>Số lượng</FieldLabel>
          <Input
            id={`${id}-quantity`}
            type="number"
            inputMode="decimal"
            min="0"
            step={stockIssueQuantityStep(unit?.quantityPrecision)}
            className={AI_FORM_TOUCH_INPUT}
            value={line.quantity}
            aria-invalid={Boolean(errors.quantity)}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </Field>
        <AiFormLineUnitField
          id={`${id}-unit`}
          line={line}
          baseUnitOnly={baseUnitOnly}
          isInvalid={Boolean(errors.unit)}
          onChange={onUnitChange}
        />
      </div>
      <FieldError role="status">{errors.quantity}</FieldError>
      <FieldError role="status">{errors.unit}</FieldError>

      {product && hasQuantity && factor !== 1 ? (
        <p className="text-xs font-medium tabular-nums">
          = {formatStockIssueQuantity(getAiFormLineBaseQuantity(line))} {product.baseUnitName}
        </p>
      ) : null}
      {showsStock && product && hasQuantity && exceedsAiFormLineAvailable(line) ? (
        <p className="text-warning text-xs">
          Cảnh báo thiếu tồn: có thể không đủ hàng khi xuất; kiểm tra lại ở bước xử lý phiếu.
        </p>
      ) : null}
    </div>
  )
}
