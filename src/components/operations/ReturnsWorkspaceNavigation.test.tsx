import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { ReturnsWorkspaceNavigation } from './ReturnsWorkspaceNavigation'

describe('ReturnsWorkspaceNavigation', () => {
  it.each(['goodsReturnRequests', 'supplierReturns'] as const)(
    'keeps one active route at %s',
    (currentView) => {
      render(
        <ReturnsWorkspaceNavigation
          currentView={currentView}
          permissions={[P.GOODS_RETURN_REQUESTS_VIEW, P.SUPPLIER_RETURNS_VIEW]}
        />
      )
      const links = screen.getAllByRole('link')
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        APP_ROUTES.goodsReturnRequests,
        APP_ROUTES.supplierReturns,
      ])
      expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([
        screen.getByRole('link', {
          name: currentView === 'goodsReturnRequests' ? 'Trả hàng khách' : 'Trả hàng NCC',
        }),
      ])
    }
  )

  it('does not expose links without the matching view permission', () => {
    render(
      <ReturnsWorkspaceNavigation
        currentView="supplierReturns"
        permissions={[P.SUPPLIER_RETURNS_VIEW]}
      />
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Trả hàng NCC' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
