import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ExcelExportButton } from './ExcelExportButton'

describe('Excel export selection menu', () => {
  it('offers explicit scopes without exporting when the menu opens', async () => {
    const user = userEvent.setup()
    const all = vi.fn(),
      selected = vi.fn()
    render(
      <TooltipProvider>
        <ExcelExportButton
          isPending={false}
          onExport={all}
          selection={{ count: 2, onExport: selected }}
        />
      </TooltipProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(all).not.toHaveBeenCalled()
    expect(screen.getByRole('menuitem', { name: 'Toàn bộ kết quả theo bộ lọc' })).toBeVisible()
    await user.click(screen.getByRole('menuitem', { name: 'Các dòng đã chọn (2)' }))
    expect(selected).toHaveBeenCalledOnce()
    expect(all).not.toHaveBeenCalled()
  })
  it('prevents reopening the menu while pending but allows keyboard focus to leave', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <ExcelExportButton
          isPending
          onExport={vi.fn()}
          selection={{ count: 2, onExport: vi.fn() }}
        />
        <button>Tiếp theo</button>
      </TooltipProvider>
    )
    screen.getByRole('button', { name: 'Xuất Excel' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Tiếp theo' })).toHaveFocus()
  })
})
