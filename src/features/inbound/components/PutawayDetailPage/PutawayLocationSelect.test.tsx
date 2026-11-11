import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SlotOption } from './PutawayForm'
import { PutawayLocationSelect } from './PutawayLocationSelect'

const slot: SlotOption = {
  id: 'slot-1',
  code: 'A-01-01-VERY-LONG-CODE',
  name: 'Kệ tầng một rất dài',
  zoneId: 'zone-1',
  zoneLabel: 'Khu A',
  hierarchy: 'Khu A / Kệ 01',
  capacityLabel: 'Còn 120 / 200',
} as SlotOption

function renderSelect() {
  return render(
    <PutawayLocationSelect
      id="slot"
      value="slot-1"
      slots={[slot]}
      invalid={false}
      disabled={false}
      compact
      onChange={vi.fn()}
    />
  )
}

describe('PutawayLocationSelect layout (BUG-015)', () => {
  it('keeps the trigger label truncatable so it cannot overflow into the next cell', () => {
    renderSelect()
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('overflow-hidden')
    const label = screen.getByText('A-01-01-VERY-LONG-CODE - Kệ tầng một rất dài')
    expect(label.className).toEqual(expect.stringContaining('min-w-0'))
    expect(label.className).toEqual(expect.stringContaining('truncate'))
  })

  it('opens a popup at least 28rem wide instead of matching a narrow trigger', () => {
    Element.prototype.scrollIntoView ??= vi.fn()
    renderSelect()
    fireEvent.click(screen.getByRole('combobox'))
    const popup = screen.getByRole('dialog', { name: 'Chọn vị trí lưu trữ' })
    expect(popup.className).toContain(
      'w-[max(var(--radix-popover-trigger-width),min(28rem,calc(100vw-2rem)))]'
    )
  })
})
