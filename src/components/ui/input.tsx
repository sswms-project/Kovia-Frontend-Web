import * as React from 'react'

import { commaDecimalToDot } from '@/lib/quantity-rules'
import { cn } from '@/lib/utils'

// Ô số không nhận ký hiệu khoa học (1e3) hay dấu "+": số lượng chỉ nhập dạng thập phân thường.
const NUMBER_INPUT_BLOCKED_KEYS = new Set(['e', 'E', '+'])

/**
 * Trình duyệt locale có dấu thập phân "." (vd. en-US) coi "," trong `type=number` là dấu phân nhóm:
 * gõ hoặc dán "1,5" thành 15 mà không báo lỗi. Ở đây đổi dấu phẩy thành dấu thập phân trước khi trình
 * duyệt đọc. Trình duyệt locale có dấu thập phân "," (vd. vi) đã đọc đúng nên không can thiệp.
 * Bắt `beforeinput` ở cấp document để phủ cả gõ phím, dán và cả các `<input type="number">` không dùng
 * component này.
 */
function commaAsDecimal(event: InputEvent) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'number') return
  const text = event.data ?? event.dataTransfer?.getData('text/plain') ?? ''
  if (!text.includes(',')) return
  event.preventDefault()
  // ponytail: execCommand là cách duy nhất chèn vào ô number mà giữ con trỏ và undo; mọi trình duyệt hiện
  // hành vẫn hỗ trợ. Nếu bị gỡ, chuyển ô số lượng sang type="text" inputMode="decimal".
  document.execCommand('insertText', false, commaDecimalToDot(text))
}

if (typeof document !== 'undefined') {
  const browserDecimal = new Intl.NumberFormat(navigator.language)
    .formatToParts(1.5)
    .find((part) => part.type === 'decimal')?.value
  const flag = '__kmsCommaDecimalListener'
  const registry = window as unknown as Record<string, boolean>
  if (browserDecimal === '.' && !registry[flag]) {
    registry[flag] = true
    document.addEventListener('beforeinput', commaAsDecimal, true)
  }
}

function Input({ className, type, onKeyDown, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      onKeyDown={(event) => {
        if (type === 'number' && NUMBER_INPUT_BLOCKED_KEYS.has(event.key)) event.preventDefault()
        onKeyDown?.(event)
      }}
      data-slot="input"
      className={cn(
        'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-none border bg-transparent px-2.5 py-1 text-xs transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-1 md:text-xs',
        className
      )}
      {...props}
    />
  )
}

export { Input }
