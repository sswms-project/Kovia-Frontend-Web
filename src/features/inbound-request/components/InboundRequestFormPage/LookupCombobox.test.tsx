import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LookupCombobox } from './LookupCombobox'

afterEach(cleanup)

function renderCombobox(onFooterClick = vi.fn(), inDialog = false) {
  render(
    <div role={inDialog ? 'dialog' : undefined} aria-label={inDialog ? 'Test modal' : undefined}>
      <LookupCombobox
        value=""
        options={[{ value: 'a', label: 'Ô A' }]}
        placeholder="Chọn vị trí"
        emptyMessage="Không có"
        ariaLabel="Vị trí"
        isLoading={false}
        isInvalid={false}
        onChange={vi.fn()}
        onSearchChange={vi.fn()}
        footerAction={{ label: 'Chọn trong sơ đồ kho', onClick: onFooterClick }}
      />
    </div>
  )
  return onFooterClick
}

describe('LookupCombobox footer action', () => {
  it('portals the list into its containing modal so wheel and touch stay within the scroll lock', () => {
    renderCombobox(vi.fn(), true)
    const input = screen.getByRole('combobox', { name: 'Vị trí' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const list = within(screen.getByRole('dialog')).getByRole('listbox')
    expect(list.getAttribute('data-scrollbar')).toBe('slim')
    expect(within(list).getByRole('option', { name: 'Ô A' })).toBeInTheDocument()
  })

  it('keeps the default body portal outside modals', () => {
    renderCombobox()
    const input = screen.getByRole('combobox', { name: 'Vị trí' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox').closest('[role="dialog"]')).toBeNull()
  })

  it('shows the action under the list and runs it once when pressed', () => {
    const onFooterClick = renderCombobox()
    const input = screen.getByRole('combobox', { name: 'Vị trí' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trong sơ đồ kho' }))
    expect(onFooterClick).toHaveBeenCalledTimes(1)
  })
})
