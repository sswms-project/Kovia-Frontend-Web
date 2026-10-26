'use client'

import { CircleCheck, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CameraScanControl } from '@/components/operations/scanning'
import { resolveSlotCode } from './slot-code'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Keep desktop scanner focus without opening the phone keyboard ahead of the camera.
    if (open && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus()
  }, [open])

  function confirm(rawCode: string) {
    if (disabled) return false
    const result = resolveSlotCode(rawCode, slots, slotId)
    if (result.status === 'error') {
      setError(result.message)
      return false
    }
    setError(null)
    setCode('')
    setOpen(false)
    onConfirm(result.slotId, result.code)
    return true
  }

  if (confirmedCode)
    return (
      <p
        className="text-primary animate-in fade-in-0 zoom-in-95 animation-duration-200 flex basis-full flex-wrap items-center gap-1.5 text-xs motion-reduce:animate-none"
        role="status"
      >
        <CircleCheck aria-hidden="true" className="size-3.5" />
        Đã xác nhận bằng mã{' '}
        <span className="font-mono break-all" translate="no">
          {confirmedCode}
        </span>
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
          required
            ? 'border-warning text-warning size-11 shrink-0 sm:size-8'
            : 'text-muted-foreground size-11 shrink-0 sm:size-8'
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
      <CameraScanControl
        key={slotId}
        label="Mã vị trí của dòng cất"
        disabled={disabled}
        mode="single"
        onCode={confirm}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          ref={inputRef}
          value={code}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label="Quét hoặc nhập mã vị trí để xác nhận"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="Quét hoặc nhập mã vị trí"
          className="h-11 min-w-0 flex-1 basis-full font-mono text-base sm:h-8 sm:basis-auto sm:text-xs"
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key !== 'Enter') return
            // Máy quét gửi Enter sau mã; không để nó gửi cả form cất hàng.
            event.preventDefault()
            confirm(code)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || code.trim().length === 0}
          className="h-11 touch-manipulation sm:h-8"
          onClick={() => confirm(code)}
        >
          Xác nhận
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 touch-manipulation sm:h-8"
          onClick={() => setOpen(false)}
        >
          Đóng
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs break-words" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
