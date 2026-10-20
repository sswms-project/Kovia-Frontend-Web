import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DesignerRackTools } from './DesignerRackTools'

it('offers direct contextual alignment actions, requiring three racks for distribution', () => {
  const onArrange = vi.fn()
  const props = {
    count: 2,
    referenceCode: 'R1',
    snapObjects: true,
    disabled: false,
    canArrange: (operation: string) => operation !== 'right',
    onArrange,
    onToggleSnap: vi.fn(),
    onFit: vi.fn(),
    onClear: vi.fn(),
  }
  const view = render(<DesignerRackTools {...props} />)
  expect(screen.queryByRole('button', { name: 'Chọn nhiều kệ' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Căn trái' }))
  expect(onArrange).toHaveBeenCalledExactlyOnceWith('left')
  expect(screen.getByRole('button', { name: 'Căn phải' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Giãn đều ngang' })).toBeDisabled()
  view.rerender(<DesignerRackTools {...props} count={3} />)
  fireEvent.click(screen.getByRole('button', { name: 'Giãn đều ngang' }))
  expect(onArrange).toHaveBeenLastCalledWith('distribute-x')
  view.rerender(<DesignerRackTools {...props} count={3} disabled />)
  expect(screen.getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(
    true
  )
})
