'use client'

import { useId, useRef, useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { CameraScanControl } from '@/components/operations/scanning'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatInventoryLocation,
  formatInventoryQuantity,
} from '@/features/inventory/utils/inventory-format'
import { codesMatch } from '@/features/transfer/utils/transfer-scan'
import { playScanFeedback, prepareScanFeedback } from '@/lib/scan-feedback'
import { useScanPreferences } from '@/lib/scan-preferences'
import type { ConfirmSupplierReturnDeliveryFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturnItem } from '../../types/supplier-return.types'

export function SupplierReturnDeliveryLine({
  line,
  index,
  form,
  disabled,
}: {
  readonly line: SupplierReturnItem
  readonly index: number
  readonly form: UseFormReturn<ConfirmSupplierReturnDeliveryFormValues>
  readonly disabled: boolean
}) {
  const id = useId()
  const quantityRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preferences] = useScanPreferences()
  const current = useWatch({ control: form.control, name: `items.${index}` })
  const needsScan = (current?.deliveredQuantity ?? 0) > 0
  const sourceCodes = line.sourceScanCodes ?? []
  const productCodes = line.productScanCodes ?? [line.sku]
  const locationConfirmed = codesMatch(current?.scannedSlotCode ?? '', ...sourceCodes)
  const productConfirmed =
    locationConfirmed && codesMatch(current?.scannedProductCode ?? '', ...productCodes)
  const sourceLocation = line.sourceLocation || formatInventoryLocation(line)
  const errors = form.formState.errors.items?.[index]
  const quantityRegistration = form.register(`items.${index}.deliveredQuantity`, {
    valueAsNumber: true,
  })

  function scan(code: string) {
    if (disabled || !needsScan) return false
    const value = code.trim()
    if (
      value.length > 100 ||
      !codesMatch(value, ...(locationConfirmed ? productCodes : sourceCodes))
    ) {
      setError(
        locationConfirmed
          ? 'Mã hàng chưa khớp sản phẩm cần trả.'
          : 'Mã vị trí chưa khớp nơi lấy hàng của dòng này.'
      )
      return false
    }
    setError(null)
    setInput('')
    if (!locationConfirmed) {
      form.setValue(`items.${index}.scannedProductCode`, '', { shouldDirty: true })
      form.setValue(`items.${index}.scannedSlotCode`, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } else {
      form.setValue(`items.${index}.scannedProductCode`, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
      quantityRef.current?.focus()
      quantityRef.current?.select()
    }
    return true
  }
  function confirmTyped() {
    if (preferences.feedback) prepareScanFeedback()
    const accepted = scan(input)
    if (preferences.feedback) playScanFeedback(accepted ? 'success' : 'error')
  }

  return (
    <article className="bg-card flex min-w-0 shrink-0 flex-col gap-3 border p-3 sm:p-4">
      <div>
        <h3 className="text-base font-semibold break-words">{line.productName}</h3>
        <p className="text-muted-foreground font-mono text-sm">
          {line.sku}
          {line.lotNumber ? ` · Lô ${line.lotNumber}` : ''}
        </p>
        <p className="mt-1 text-sm break-words">Lấy tại: {sourceLocation}</p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="flex min-w-0 flex-col gap-2">
          {needsScan ? (
            productConfirmed ? (
              <>
                <p
                  role="status"
                  className="text-primary flex items-center gap-2 text-sm font-medium"
                >
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  Đã kiểm tra vị trí và hàng hóa
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 self-start"
                  disabled={disabled}
                  onClick={() => {
                    form.setValue(`items.${index}.scannedSlotCode`, '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    form.setValue(`items.${index}.scannedProductCode`, '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    setInput('')
                    setError(null)
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                  Quét lại
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" role="status">
                  {locationConfirmed ? '2. Quét mã hàng' : '1. Quét vị trí lấy hàng'}
                </p>
                <CameraScanControl
                  label={`Giao trả ${line.sku}`}
                  disabled={disabled}
                  mode="continuous"
                  onCode={scan}
                />
                <Label htmlFor={`${id}-code`}>
                  {locationConfirmed ? 'Hoặc nhập mã hàng' : 'Hoặc nhập mã vị trí'}
                </Label>
                <div className="flex min-w-0 gap-2">
                  <Input
                    id={`${id}-code`}
                    value={input}
                    maxLength={100}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 min-w-0 text-base"
                    disabled={disabled}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        confirmTyped()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0"
                    disabled={disabled || !input.trim()}
                    onClick={confirmTyped}
                  >
                    Xác nhận mã
                  </Button>
                </div>
                {!sourceCodes.length && (
                  <p className="text-destructive text-sm">
                    Thiếu thông tin mã vị trí. Tải lại phiếu trước khi giao.
                  </p>
                )}
              </>
            )
          ) : (
            <p className="text-muted-foreground text-sm">
              Không giao dòng này; lượng giữ sẽ được giải phóng.
            </p>
          )}
          {needsScan && error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <FieldError errors={[errors?.scannedSlotCode, errors?.scannedProductCode]} />
        </div>
        <Field data-invalid={Boolean(errors?.deliveredQuantity)}>
          <FieldLabel htmlFor={`${id}-quantity`}>Số lượng giao</FieldLabel>
          <Input
            {...quantityRegistration}
            ref={(element) => {
              quantityRegistration.ref(element)
              quantityRef.current = element
            }}
            id={`${id}-quantity`}
            type="number"
            className="h-11 text-base"
            inputMode="decimal"
            min={0}
            max={line.quantity}
            step={10 ** -Math.min(line.quantityPrecision ?? 2, 2)}
            disabled={disabled}
            aria-invalid={Boolean(errors?.deliveredQuantity)}
            onBlur={(event) => {
              void quantityRegistration.onBlur(event)
              if (!event.target.value)
                form.setValue(`items.${index}.deliveredQuantity`, 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
            }}
          />
          <p className="text-muted-foreground text-sm">
            Đã duyệt: {formatInventoryQuantity(line.quantity)} {line.unit}
          </p>
          {Number.isFinite(current?.deliveredQuantity) &&
            current.deliveredQuantity >= 0 &&
            current.deliveredQuantity <= line.quantity && (
              <p className="text-muted-foreground text-sm">
                Chưa giao: {formatInventoryQuantity(line.quantity - current.deliveredQuantity)}{' '}
                {line.unit}
              </p>
            )}
          <FieldError errors={[errors?.deliveredQuantity]} />
        </Field>
      </div>
    </article>
  )
}
