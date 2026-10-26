'use client'

import { CheckCheck, ScanLine } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CameraScanControl } from '@/components/operations/scanning'
import { cn } from '@/lib/utils'
import type { GoodsReceiptFormValues } from '../../schemas/inbound.schema'
import type { ReceivingTask, ReceivingTaskLine } from '../../types/inbound.types'
import {
  getReceiptUnit,
  getRemainingReceiptQuantity,
  matchScannedReceiptLine,
} from '../../utils/receipt-units'

interface ReceiveQuickActionsProps {
  readonly task: ReceivingTask
  readonly form: UseFormReturn<GoodsReceiptFormValues>
  readonly disabled: boolean
}

/**
 * Hai cách nhận nhanh thay cho gõ tay từng dòng: quét mã hàng để cộng dần số lượng thực nhận, hoặc
 * một lần bấm khi cả chuyến giao đủ. Nhân viên vẫn sửa được dòng lệch bên dưới trước khi gửi.
 */
export function ReceiveQuickActions({ task, form, disabled }: ReceiveQuickActionsProps) {
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [scanCount, setScanCount] = useState(0)

  function findFormIndex(line: ReceivingTaskLine) {
    return form
      .getValues('lines')
      .findIndex((value) => value.inboundRequestItemId === line.inboundRequestItemId)
  }

  function receiveAllRemaining() {
    for (const line of task.lines) {
      const index = findFormIndex(line)
      if (index < 0) continue
      const unitId = form.getValues(`lines.${index}.enteredUnitId`)
      const remaining = getRemainingReceiptQuantity(line, unitId)
      if (remaining.unitId !== unitId) {
        // Số hỏng đang nhập theo đơn vị cũ, không còn nghĩa khi đổi đơn vị.
        form.setValue(`lines.${index}.enteredUnitId`, remaining.unitId, { shouldDirty: true })
        form.setValue(`lines.${index}.damagedQty`, 0, { shouldDirty: true })
        form.setValue(`lines.${index}.rejectedQty`, 0, { shouldDirty: true })
      }
      form.setValue(`lines.${index}.receivedQty`, remaining.quantity, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
    setScanCount((count) => count + 1)
    setFeedback({
      ok: true,
      message: 'Đã điền đủ số lượng còn lại cho mọi dòng. Sửa dòng nào thiếu hoặc hỏng nếu có.',
    })
  }

  function scan(rawCode: string) {
    if (disabled) return false
    const result = matchScannedReceiptLine(rawCode, task.lines)
    setCode('')
    setScanCount((count) => count + 1)
    if (result.status === 'error') {
      setFeedback({ ok: false, message: result.message })
      return false
    }
    const index = findFormIndex(result.line)
    if (index < 0) {
      setFeedback({ ok: false, message: `${result.line.productName} không nằm trong phiếu này.` })
      return false
    }
    const unitId = form.getValues(`lines.${index}.enteredUnitId`)
    const unit = getReceiptUnit(result.line, unitId)
    const remaining = getRemainingReceiptQuantity(result.line, unitId)
    const limit =
      remaining.unitId === unitId ? remaining.quantity : result.line.remainingQuantity / unit.factor
    const next = (form.getValues(`lines.${index}.receivedQty`) || 0) + 1
    if (next > limit) {
      setFeedback({
        ok: false,
        message: `${result.line.productName} đã đủ số lượng còn lại của yêu cầu. Hàng dư cần báo quản lý.`,
      })
      return false
    }
    form.setValue(`lines.${index}.receivedQty`, next, { shouldDirty: true, shouldValidate: true })
    setFeedback({
      ok: true,
      message: `${result.line.productName}: ${next}/${limit} ${unit.name}.`,
    })
    return true
  }

  return (
    <section className="bg-muted/40 flex flex-col gap-2 border p-3" aria-label="Nhận nhanh">
      <CameraScanControl label="Mã hàng nhận" disabled={disabled} onCode={scan} />
      {feedback ? (
        <p
          key={scanCount}
          className={cn(
            'animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 text-sm break-words motion-reduce:animate-none',
            feedback.ok ? 'text-primary' : 'text-destructive'
          )}
          role={feedback.ok ? 'status' : 'alert'}
        >
          {feedback.message}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Mỗi lần quét hợp lệ cộng 1 theo đơn vị nhận đang chọn ở dòng hàng. Kiểm tra đơn vị trước khi
        quét; quét mã không tự gửi phiếu.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ScanLine aria-hidden="true" className="text-primary size-5 shrink-0" />
          <Input
            value={code}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="h-11 min-w-0 font-mono text-base sm:h-8 sm:text-sm"
            aria-label="Quét mã hàng vừa nhận"
            placeholder="Quét mã vạch hoặc SKU, mỗi lần quét cộng 1"
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              // Máy quét gửi Enter sau mã; không để nó gửi cả phiếu nhận.
              event.preventDefault()
              scan(code)
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || code.trim().length === 0}
            className="h-11 touch-manipulation sm:h-8"
            onClick={() => scan(code)}
          >
            Cộng 1
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 touch-manipulation sm:h-8"
          disabled={disabled}
          onClick={receiveAllRemaining}
        >
          <CheckCheck aria-hidden="true" />
          Nhận đủ tất cả
        </Button>
      </div>
      {!feedback ? (
        <p className="text-muted-foreground text-xs">
          Chỉ bấm “Nhận đủ tất cả” sau khi đã kiểm đếm thực tế. Xác nhận nhận hàng ghi tồn chờ kiểm;
          kết quả kiểm hàng vẫn cần được người có quyền phê duyệt trước khi cất.
        </p>
      ) : null}
    </section>
  )
}
