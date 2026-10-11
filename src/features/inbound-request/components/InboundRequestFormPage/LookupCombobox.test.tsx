import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LookupCombobox } from './LookupCombobox'

afterEach(cleanup)

function renderCombobox(onFooterClick = vi.fn()) {
  render(
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
  )
  return onFooterClick
}

describe('LookupCombobox footer action', () => {
  it('shows the action under the list and runs it once when pressed', () => {
    const onFooterClick = renderCombobox()
    const input = screen.getByRole('combobox', { name: 'Vị trí' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('button', { name: 'Chọn trong sơ đồ kho' }))
    expect(onFooterClick).toHaveBeenCalledTimes(1)
  })
})
