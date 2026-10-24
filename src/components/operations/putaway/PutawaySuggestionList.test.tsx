import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PutawaySlotSuggestion } from '@/types/putaway.types'
import { PutawaySuggestionList } from './PutawaySuggestionList'

const suggestion: PutawaySlotSuggestion = {
  slotId: 'slot-a04',
  slotCode: '__SYSTEM_DEFAULT__',
  rackCode: 'A04',
  zoneName: 'Khu vực 1',
  reason: 'Đang chứa cùng sản phẩm',
  warnings: [],
  suggestedQuantity: 20,
  availableQuantity: 114,
}

function renderSuggestions(overrides: Partial<PutawaySlotSuggestion> = {}) {
  const onApply = vi.fn()
  const view = render(
    <PutawaySuggestionList
      entry={{
        itemId: 'item-1',
        suggestions: [{ ...suggestion, ...overrides }],
        unallocatedQuantity: 0,
      }}
      unitName="Cái"
      disabled={false}
      onApply={onApply}
    />
  )
  return { ...view, onApply }
}

describe('PutawaySuggestionList location labels', () => {
  it('shows the rack instead of its internal slot code and applies the unchanged ID', () => {
    const { container, onApply } = renderSuggestions()
    expect(screen.getByText('Kệ A04')).toBeInTheDocument()
    expect(container.textContent).not.toContain('__SYSTEM_DEFAULT__')
    fireEvent.click(screen.getByRole('button', { name: 'Dùng vị trí này' }))
    expect(onApply).toHaveBeenCalledWith('slot-a04')
  })

  it('keeps a physical slot code even when rack metadata is present', () => {
    renderSuggestions({ slotCode: 'A04-02' })
    expect(screen.getByText('A04-02')).toBeInTheDocument()
    expect(screen.queryByText('Kệ A04')).not.toBeInTheDocument()
  })

  it('does not expose the internal code when rack metadata is unavailable', () => {
    const { container } = renderSuggestions({ rackCode: undefined })
    expect(screen.getByText('Vị trí lưu trữ theo kệ')).toBeInTheDocument()
    expect(container.textContent).not.toContain('__SYSTEM_DEFAULT__')
  })

  it('also formats internal slots among alternate suggestions', () => {
    render(
      <PutawaySuggestionList
        entry={{
          itemId: 'item-1',
          suggestions: [
            { ...suggestion, slotId: 'physical', slotCode: 'A01-01' },
            { ...suggestion, suggestedQuantity: 0 },
          ],
          unallocatedQuantity: 0,
        }}
        unitName="Cái"
        disabled={false}
        onApply={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '1 vị trí thay thế' }))
    expect(screen.getByText('Kệ A04')).toBeInTheDocument()
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
  })
})
