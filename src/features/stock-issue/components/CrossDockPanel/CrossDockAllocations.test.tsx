import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CrossDockAllocations } from './CrossDockAllocations'

afterEach(cleanup)
it('opens the allocation explanation with one tap and hides it with Escape', async () => {
  render(
    <TooltipProvider>
      <CrossDockAllocations
        allocations={[
          {
            itemId: 'item',
            productId: 'product',
            inventoryStockId: 'stock',
            slotId: 'slot',
            lotId: null,
            lotNumber: null,
            expiryDate: null,
            quantity: 20,
            directFromReceiving: false,
            reason: 'FIFO trong nhóm không có hạn dùng.',
            sku: 'SKU00001',
            productName: 'Kèm A3',
            sourcePath: 'Khu K01 / Kệ A04',
          },
        ]}
      />
    </TooltipProvider>
  )
  const trigger = screen.getAllByRole('button', { name: 'Giải thích phân bổ SKU00001' })[0]!
  expect(screen.queryByText('FIFO trong nhóm không có hạn dùng.')).not.toBeInTheDocument()
  fireEvent.click(trigger)
  await waitFor(() => expect(screen.getByText('FIFO trong nhóm không có hạn dùng.')).toBeVisible())
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByText('FIFO trong nhóm không có hạn dùng.')).not.toBeInTheDocument()
  )
})
