import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { InventoryExportButton } from './InventoryExportButton'

describe('InventoryExportButton', () => {
  it('is an icon-only accessible action', () => {
    const onExport = vi.fn()
    render(
      <TooltipProvider>
        <InventoryExportButton isPending={false} onExport={onExport} />
      </TooltipProvider>
    )
    const button = screen.getByRole('button', { name: 'Xuất Excel' })
    expect(button).toHaveTextContent('')
    fireEvent.click(button)
    expect(onExport).toHaveBeenCalledOnce()
  })
  it('disables duplicate export with keyboard-accessible feedback', () => {
    const onExport = vi.fn()
    render(
      <TooltipProvider>
        <InventoryExportButton isPending onExport={onExport} />
      </TooltipProvider>
    )
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Đang xuất Excel…')
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(onExport).not.toHaveBeenCalled()
  })
  it('keeps the focused action in the tab order while busy', () => {
    const onExport = vi.fn()
    const { rerender } = render(
      <TooltipProvider>
        <InventoryExportButton isPending={false} onExport={onExport} />
      </TooltipProvider>
    )
    const button = screen.getByRole('button', { name: 'Xuất Excel' })
    button.focus()
    rerender(
      <TooltipProvider>
        <InventoryExportButton isPending onExport={onExport} />
      </TooltipProvider>
    )
    expect(button).toHaveFocus()
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })
  it('makes the reason available by keyboard when export is unavailable', () => {
    render(
      <TooltipProvider>
        <InventoryExportButton
          isPending={false}
          disabledReason="Không có dữ liệu phù hợp để xuất."
          onExport={vi.fn()}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled()
    expect(screen.getByLabelText('Không có dữ liệu phù hợp để xuất.')).toHaveAttribute(
      'tabindex',
      '0'
    )
  })
})
