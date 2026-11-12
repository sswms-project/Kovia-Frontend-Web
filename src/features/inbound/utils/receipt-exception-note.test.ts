import { describe, expect, it, vi } from 'vitest'
import { clearExceptionReasonWhenNoIssue } from './receipt-exception-note'

function formWith(line: { rejectedQty?: number; damagedQty: number; exceptionReason: string }) {
  const setValue = vi.fn()
  return { setValue, form: { getValues: vi.fn(() => line), setValue } as never }
}

describe('clearExceptionReasonWhenNoIssue', () => {
  it('clears the note when refused and damaged quantities are both zero', () => {
    const { form, setValue } = formWith({ rejectedQty: 0, damagedQty: 0, exceptionReason: 'Móp' })
    clearExceptionReasonWhenNoIssue(form, 2)
    expect(setValue).toHaveBeenCalledWith('lines.2.exceptionReason', '', {
      shouldDirty: true,
      shouldValidate: true,
    })
  })

  it('keeps the note while some quantity is still refused', () => {
    const { form, setValue } = formWith({ rejectedQty: 1, damagedQty: 0, exceptionReason: 'Móp' })
    clearExceptionReasonWhenNoIssue(form, 0)
    expect(setValue).not.toHaveBeenCalled()
  })

  it('keeps the note while damaged goods still need it', () => {
    const { form, setValue } = formWith({ rejectedQty: 0, damagedQty: 2, exceptionReason: 'Vỡ' })
    clearExceptionReasonWhenNoIssue(form, 0)
    expect(setValue).not.toHaveBeenCalled()
  })
})
