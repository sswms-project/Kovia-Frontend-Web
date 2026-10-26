import { useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { parseTransferQuantityInput } from '../../schemas/transfer-receipt.schema'

type Props = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  readonly value: number
  readonly onChange: (value: number) => void
}

export function TransferReceiptQuantityInput({ value, onChange, onBlur, ...props }: Props) {
  const edited = useRef(false)
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '')
  const [previousValue, setPreviousValue] = useState(value)
  if (!Object.is(previousValue, value)) {
    setPreviousValue(value)
    // Preserve an in-progress decimal separator while keeping form resets in sync.
    if (!Object.is(parseTransferQuantityInput(text), value))
      setText(Number.isFinite(value) ? String(value) : '')
  }
  return (
    <Input
      {...props}
      value={text}
      onChange={(event) => {
        edited.current = true
        setText(event.target.value)
        onChange(parseTransferQuantityInput(event.target.value))
      }}
      onBlur={(event) => {
        if (edited.current && !text.trim() && !props.disabled && !props.readOnly) {
          setText('0')
          onChange(0)
        }
        edited.current = false
        onBlur?.(event)
      }}
    />
  )
}
