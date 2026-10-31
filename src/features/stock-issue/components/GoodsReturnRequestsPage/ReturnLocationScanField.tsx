'use client'

import { useId, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { CameraScanControl } from '@/components/operations/scanning'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { playScanFeedback, prepareScanFeedback } from '@/lib/scan-feedback'
import { useScanPreferences } from '@/lib/scan-preferences'
import type { GoodsReturnSlotSuggestion } from '../../types/stock-issue.types'
import { matchesReturnLocationCode } from '../../utils/return-location-scan'

export function ReturnLocationScanField({
  slot,
  value,
  disabled,
  onConfirm,
}: {
  readonly slot: GoodsReturnSlotSuggestion | undefined
  readonly value: string
  readonly disabled: boolean
  readonly onConfirm: (code: string) => void
}) {
  const id = useId()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preferences] = useScanPreferences()
  const verified = matchesReturnLocationCode(value, slot)
  function scan(code: string) {
    if (disabled || !slot) return false
    if (!matchesReturnLocationCode(code, slot)) {
      setError('Mã chưa khớp vị trí đã chọn. Kiểm tra lại nhãn khu vực/kệ.')
      return false
    }
    setError(null)
    setInput('')
    onConfirm(code.trim())
    return true
  }
  function confirmTyped() {
    if (preferences.feedback) prepareScanFeedback()
    const accepted = scan(input)
    if (preferences.feedback) playScanFeedback(accepted ? 'success' : 'error')
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {verified ? (
        <p role="status" className="text-primary flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          Đã xác nhận vị trí cất
        </p>
      ) : (
        <>
          <CameraScanControl
            label="Vị trí nhập lại kho"
            mode="single"
            disabled={disabled || !slot}
            onCode={scan}
          />
          <Label htmlFor={id}>Hoặc nhập mã vị trí</Label>
          <div className="flex min-w-0 gap-2">
            <Input
              id={id}
              value={input}
              maxLength={100}
              className="h-11 min-w-0 text-base"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || !slot}
              placeholder="Mã kệ hoặc vị trí…"
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
              disabled={disabled || !slot || !input.trim()}
              onClick={confirmTyped}
            >
              Xác nhận mã
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
