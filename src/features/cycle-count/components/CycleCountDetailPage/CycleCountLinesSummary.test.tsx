import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountDetail, CycleCountItem } from '../../types/cycle-count.types'
import { CycleCountLinesSummary } from './CycleCountLinesSummary'

function item(index: number, counted: number | null, system: number | null): CycleCountItem {
  return {
    id: `item-${index}`,
    productId: `product-${index}`,
    productName: `Sản phẩm ${index}`,
    productSku: `SKU-${index}`,
    slotId: `slot-${index}`,
    slotCode: `A-${index}`,
    systemQuantity: system,
    countedQuantity: counted,
    difference: counted === null || system === null ? null : counted - system,
    countedBy: null,
    countedAt: null,
    requestedRecountRound: null,
    activeAdjustmentId: null,
    activeAdjustmentStatus: null,
    countHistory: [],
    lotId: null,
    lotNumber: null,
    qualityStatus: 'Good',
    unitName: 'Lon',
    rackCode: null,
    isSystemDefaultSlot: false,
    expiryDate: null,
    countedByName: null,
    note: null,
    countedDamagedQuantity: null,
    countMethod: 'Manual',
    scannedBarcode: null,
    productBarcode: null,
    slotBarcode: null,
    damageReason: null,
    damageEvidence: [],
    damageConfirmedAt: null,
    damageCaseId: null,
    damageCaseStatus: null,
  }
}

function detailWith(items: CycleCountItem[]): CycleCountDetail {
  return { id: 'count-1', recountRound: 1, items } as unknown as CycleCountDetail
}

describe('CycleCountLinesSummary', () => {
  it('previews the first variance lines and links to the full lines page', () => {
    const items = Array.from({ length: 7 }, (_, index) => item(index + 1, index, index + 2))
    render(<CycleCountLinesSummary detail={detailWith(items)} countedCount={7} varianceCount={7} />)

    expect(screen.getByText('Sản phẩm 1')).toBeTruthy()
    expect(screen.queryByText('Sản phẩm 6')).toBeNull()
    expect(screen.getByText(/Còn 2 dòng lệch khác/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Mở chi tiết kiểm đếm/ }).getAttribute('href')).toBe(
      APP_ROUTES.cycleCountLines('count-1')
    )
    expect(screen.getByRole('link', { name: /Xem 7 dòng lệch/ }).getAttribute('href')).toBe(
      '/inventory/cycle-counts/count-1/lines?filter=variance'
    )
  })

  it('hides variance details while the count is blind', () => {
    const items = [item(1, 3, null), item(2, null, null)]
    render(
      <CycleCountLinesSummary detail={detailWith(items)} countedCount={1} varianceCount={null} />
    )

    expect(screen.getByText('Đã ẩn')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /dòng lệch/ })).toBeNull()
    expect(screen.getByText(/dòng đã đếm/).textContent).toContain('/ 2')
  })
})
