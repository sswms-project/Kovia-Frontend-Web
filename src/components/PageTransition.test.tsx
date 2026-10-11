import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageTransition } from './PageTransition'

const navigation = vi.hoisted(() => ({ pathname: '/suppliers' }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))

afterEach(() => {
  cleanup()
  navigation.pathname = '/suppliers'
})

describe('PageTransition router boundary', () => {
  it('does not remount the router slot or reset its input when the pathname changes', async () => {
    const mounted = vi.fn()
    const unmounted = vi.fn()

    function RouterSlot() {
      useEffect(() => {
        mounted()
        return () => {
          unmounted()
        }
      }, [])
      return <input aria-label="Draft" defaultValue="" />
    }

    const view = render(
      <PageTransition>
        <RouterSlot />
      </PageTransition>
    )
    const input = screen.getByRole('textbox', { name: 'Draft' })
    fireEvent.change(input, { target: { value: 'Keep router-owned state' } })
    input.focus()

    navigation.pathname = '/suppliers/import'
    view.rerender(
      <PageTransition>
        <RouterSlot />
      </PageTransition>
    )

    // Allow the former 200 ms exit animation to finish before checking for a remount.
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)))

    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(input)
    expect(input).toHaveValue('Keep router-owned state')
    expect(input).toHaveFocus()
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(unmounted).not.toHaveBeenCalled()
  })

  it('lets the router replace a page immediately without replacing the layout wrapper', () => {
    const view = render(
      <PageTransition>
        <h1>Suppliers</h1>
      </PageTransition>
    )
    const wrapper = view.container.firstElementChild

    navigation.pathname = '/suppliers/import'
    view.rerender(
      <PageTransition>
        <h1>Import suppliers</h1>
      </PageTransition>
    )

    expect(screen.getByRole('heading', { name: 'Import suppliers' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Suppliers' })).not.toBeInTheDocument()
    expect(view.container.firstElementChild).toBe(wrapper)
    expect(wrapper).toHaveClass('flex', 'min-h-0', 'w-full', 'min-w-0', 'flex-1', 'flex-col')
    expect(wrapper).not.toHaveAttribute('style')
  })
})
