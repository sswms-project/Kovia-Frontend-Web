'use client'

import { Camera, CircleCheck, ScanLine } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isCameraScanSupported } from '../../utils/camera-scan'
import { playScanFeedback } from '../../utils/scan-feedback'
import { useScanPreferences } from '../../utils/scan-preferences'

// Thư viện giải mã chỉ tải khi người dùng mở camera.
const CameraScanDialog = dynamic(
  () => import('./CameraScanDialog').then((module) => module.CameraScanDialog),
  { ssr: false }
)

/** Trả true/false để ô quét báo âm thanh/rung đúng sai; không trả gì thì không báo. */
export type ScanResult = boolean | void | Promise<boolean | void>

interface ScanInputProps {
  readonly id: string
  readonly label: string
  readonly description?: string
  /** Giá trị đã được xác nhận hợp lệ; hiển thị dấu tích khi có. */
  readonly confirmedValue?: string
  readonly error?: string | null
  readonly disabled?: boolean
  readonly autoFocus?: boolean
  /** Chuyển con trỏ vào ô khi giá trị này chuyển sang true: máy quét gõ thẳng vào ô đang focus nên bước kế tiếp phải được focus sẵn. */
  readonly focusWhen?: boolean
  readonly pending?: boolean
  /** Ẩn nút camera riêng của ô khi màn hình có khung camera dùng chung. */
  readonly hideCamera?: boolean
  /** Bấm Enter khi ô trống (máy quét không gửi gì): dùng để xác nhận khi quét từng đơn vị. */
  readonly onEmptyEnter?: () => void
  readonly onScan: (code: string) => ScanResult
}

const subscribeNothing = () => () => undefined

/** Ô nhận mã từ máy quét dạng bàn phím (kết thúc bằng Enter/Tab), camera, hoặc nhập tay rồi bấm xác nhận. */
export function ScanInput({
  id,
  label,
  description,
  confirmedValue,
  error,
  disabled = false,
  autoFocus = false,
  focusWhen = false,
  pending = false,
  hideCamera = false,
  onEmptyEnter,
  onScan,
}: ScanInputProps) {
  const [value, setValue] = useState('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preferences] = useScanPreferences()
  const canUseCamera = useSyncExternalStore(subscribeNothing, isCameraScanSupported, () => false)

  useEffect(() => {
    if (focusWhen) inputRef.current?.focus()
  }, [focusWhen])

  function handle(code: string) {
    if (!code || disabled || pending) return
    const result = onScan(code)
    if (!preferences.feedback || result === undefined) return
    void Promise.resolve(result).then((ok) => {
      if (typeof ok === 'boolean') playScanFeedback(ok ? 'success' : 'error')
    })
  }

  function submit() {
    const code = value.trim()
    if (!code) return
    handle(code)
    setValue('')
  }

  const isConfirmed = Boolean(confirmedValue) && !error

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id} className="gap-2">
        {label}
      </FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          // Máy quét Bluetooth gõ như bàn phím ngoài: ẩn bàn phím ảo để không che màn hình.
          inputMode={preferences.scannerMode ? 'none' : undefined}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={
            isConfirmed ? 'border-primary h-11 font-mono text-base' : 'h-11 font-mono text-base'
          }
          placeholder="Quét hoặc nhập mã rồi nhấn Enter"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            // Máy quét thường kết thúc bằng Enter, một số máy cấu hình Tab: cả hai đều là "quét xong".
            const isScanTerminator =
              event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)
            if (!isScanTerminator) return
            if (!value.trim()) {
              if (event.key === 'Enter' && onEmptyEnter) {
                event.preventDefault()
                onEmptyEnter()
              }
              return
            }
            event.preventDefault()
            submit()
          }}
        />
        {canUseCamera && !hideCamera ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label={`Quét bằng camera: ${label}`}
            disabled={disabled || pending}
            onClick={() => setIsCameraOpen(true)}
          >
            <Camera aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0"
          disabled={disabled || pending || !value.trim()}
          onClick={submit}
        >
          <ScanLine aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Xác nhận</span>
        </Button>
      </div>
      {isConfirmed ? (
        <p
          role="status"
          className="border-primary/40 bg-primary/10 text-primary flex items-center gap-2 border px-3 py-2 text-sm font-medium"
        >
          <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
          <span>Đã quét đúng</span>
          <span className="font-mono font-semibold" translate="no">
            {confirmedValue}
          </span>
        </p>
      ) : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {isCameraOpen ? (
        <CameraScanDialog
          open
          title={label}
          onOpenChange={(next) => {
            if (!next) setIsCameraOpen(false)
          }}
          onDecoded={handle}
        />
      ) : null}
    </Field>
  )
}
