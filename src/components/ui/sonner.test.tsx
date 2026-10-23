import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ToasterProps } from 'sonner'
import { Toaster } from './sonner'

const viewport = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('sonner', () => ({
  Toaster: ({ position, mobileOffset, offset }: ToasterProps) => (
    <div
      data-testid="toaster"
      data-position={position}
      data-offset={JSON.stringify(mobileOffset)}
      data-wide-offset={JSON.stringify(offset)}
    />
  ),
}))
afterEach(cleanup)

describe('responsive Toaster', () => {
  it('moves above mobile actions even when the root supplies a desktop position', () => {
    viewport.mobile = false
    const page = render(<Toaster position="bottom-right" />)
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'bottom-right')
    viewport.mobile = true
    page.rerender(<Toaster position="bottom-right" />)
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'top-center')
    expect(screen.getByTestId('toaster').dataset.offset).toContain('safe-area-inset-top')
    expect(screen.getByTestId('toaster').dataset.wideOffset).toContain('safe-area-inset-top')
    viewport.mobile = false
    page.rerender(<Toaster position="bottom-right" />)
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'bottom-right')
  })
})
