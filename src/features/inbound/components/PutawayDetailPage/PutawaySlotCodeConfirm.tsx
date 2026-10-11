'use client'

import { CircleCheck, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveSlotCode } from '../../utils/putaway-plan'

interface PutawaySlotCodeConfirmProps {
  readonly id: string
  readonly slots: readonly { readonly id: string; readonly code: string }[]
  readonly slotId: string
  readonly confirmedCode: string | undefined
  readonly disabled: boolean
  /** Vị trí do quản lý giao: chưa quét thì nút được làm nổi để người cất không bỏ sót. */
  readonly required?: boolean
  readonly onConfirm: (slotId: string, code: string) => void
  readonly onClear: () => void
}

/**
 * Xác nhận vị trí bằng mã: nhập tay hoặc dùng máy quét cầm tay (máy quét gõ mã rồi Enter).
 * Không bắt buộc nên mặc định chỉ là một nút biểu tượng cạnh ô chọn vị trí; khi mở hoặc đã xác
 * nhận thì chiếm trọn một hàng bên dưới (`basis-full`) trong ô vị trí.
 */
export function PutawaySlotCodeConfirm({
  id,
  slots,
  slotId,
  confirmedCode,
  disabled,
  required = false,
  onConfirm,
  onClear,
}: PutawaySlotCodeConfirmProps) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    const result = resolveSlotCode(code, slots, slotId)
    if (result.status === 'error') {
      setError(result.message)
      return
    }
    setError(null)
    setCode('')
    setOpen(false)
    onConfirm(result.slotId, result.code)
  }

  if (confirmedCode)
    return (
      <p
        className="text-primary animate-in fade-in-0 zoom-in-95 animation-duration-200 flex basis-full flex-wrap items-center gap-1.5 text-xs motion-reduce:animate-none"
        role="status"
      >
        <CircleCheck aria-hidden="true" className="size-3.5" />
        Đã xác nhận bằng mã <span className="font-mono">{confirmedCode}</span>
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto p-0 text-xs"
          disabled={disabled}
          onClick={onClear}
        >
          Bỏ xác nhận
        </Button>
      </p>
    )

  if (!open)
    return (
      <Button
        type="button"
        variant={required ? 'outline' : 'ghost'}
        size="icon"
        className={
          required ? 'border-warning text-warning shrink-0' : 'text-muted-foreground shrink-0'
        }
        disabled={disabled}
        aria-label="Quét mã vị trí"
        title="Quét hoặc nhập mã vị trí để xác nhận"
        onClick={() => setOpen(true)}
      >
        <ScanLine aria-hidden="true" />
      </Button>
    )

  return (
    <div className="animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 flex basis-full flex-col gap-1 motion-reduce:animate-none">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={code}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          aria-label="Quét hoặc nhập mã vị trí để xác nhận"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="Quét hoặc nhập mã vị trí"
          className="h-8 font-mono text-xs"
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key !== 'Enter') return
            // Máy quét gửi Enter sau mã; không để nó gửi cả form cất hàng.
            event.preventDefault()
            confirm()
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || code.trim().length === 0}
          onClick={confirm}
        >
          Xác nhận
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Đóng
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
