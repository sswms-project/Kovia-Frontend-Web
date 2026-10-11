import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoodsReceiptItem, PutAwaySuggestionsResponse } from '../../types/inbound.types'
import type { PlanDraftValidation, PlanDrafts } from '../../utils/putaway-plan-draft'
import { PutawayPlanSheet } from './PutawayPlanSheet'

const item = {
  id: 'item-1',
  productSKU: 'BEER',
  productName: 'Bia',
  baseUnitName: 'Lon',
  lotNumber: null,
  remainingPutAwayQuantity: 240,
} as GoodsReceiptItem

const suggestions: PutAwaySuggestionsResponse = {
  isAiAssisted: true,
  aiNotice: null,
  summary: 'Chia vào vị trí đang chứa cùng sản phẩm.',
  risks: ['A-01 sẽ gần đầy sau khi cất.'],
  heldSlots: [
    {
      slotId: 'slot-held',
      slotCode: 'B-02',
      productId: 'other-product',
      sku: 'WINE',
      productName: 'Rượu',
      heldQuantity: 40,
      expectedDate: '2026-10-10T03:00:00+00:00',
      inboundRequestCode: 'YC-1',
    },
  ],
  items: [
    {
      goodsReceiptItemId: 'item-1',
      remainingQuantity: 240,
      unallocatedQuantity: 40,
      suggestions: [
        {
          slotId: 'slot-a',
          slotCode: 'A-01',
          rackCode: 'KE-01',
          zoneName: 'Khu A',
          score: 80,
          reason: 'Đang chứa cùng sản phẩm',
          source: 'Ai',
          warnings: [],
          suggestedQuantity: 200,
          availableQuantity: 200,
        },
      ],
    },
  ],
}

const validValidation: PlanDraftValidation = {
  lineErrors: new Map(),
  lineWarnings: new Map(),
  itemErrors: new Map(),
  plannedByItem: new Map(),
  canSave: true,
}

afterEach(cleanup)

function renderSheet(
  overrides: {
    drafts?: PlanDrafts
    validation?: PlanDraftValidation
    suggestions?: PutAwaySuggestionsResponse | null
  } = {}
) {
  const handlers = {
    onOpenChange: vi.fn(),
    onRetrySlots: vi.fn(),
    onAddLine: vi.fn(),
    onChangeLine: vi.fn(),
    onRemoveLine: vi.fn(),
    onFillRemaining: vi.fn(),
    onSuggest: vi.fn(),
    onApplySuggestion: vi.fn(),
    onApplyBestSuggestions: vi.fn(),
    onSave: vi.fn(),
  }
  render(
    <PutawayPlanSheet
      open
      receiptCode="GR-1"
      items={[item]}
      slots={[]}
      drafts={overrides.drafts ?? {}}
      validation={overrides.validation ?? validValidation}
      suggestions={overrides.suggestions ?? null}
      isLoadingSlots={false}
      isSlotsError={false}
      isSuggesting={false}
      isSaving={false}
      {...handlers}
    />
  )
  return handlers
}

describe('PutawayPlanSheet', () => {
  it('explains that an item without a plan is left to the staff', () => {
    renderSheet()

    expect(screen.getByText(/Nhân viên sẽ tự chọn vị trí/)).toBeInTheDocument()
    expect(screen.getByText(/chưa cấu hình 240 Lon/)).toBeInTheDocument()
  })

  it('asks for AI suggestions, applies one and saves', async () => {
    const user = userEvent.setup()
    const handlers = renderSheet({ suggestions })

    await user.click(screen.getByRole('button', { name: 'Gợi ý vị trí bằng AI' }))
    expect(handlers.onSuggest).toHaveBeenCalledOnce()

    const suggestion = screen.getByText('A-01').closest('li')!
    expect(within(suggestion).getByText('AI')).toBeInTheDocument()
    await user.click(within(suggestion).getByRole('button', { name: 'Dùng vị trí này' }))
    expect(handlers.onApplySuggestion).toHaveBeenCalledWith('item-1', 'slot-a')

    await user.click(screen.getByRole('button', { name: 'Lưu vị trí cất hàng' }))
    expect(handlers.onSave).toHaveBeenCalledOnce()
  })

  it('shows the suggested quantity, what is left without a slot and slots kept for incoming stock', () => {
    renderSheet({
      suggestions,
      drafts: { 'item-1': [{ key: '1', slotId: 'slot-held', quantity: 10 }] },
    })

    expect(screen.getByText('200 Lon')).toBeInTheDocument()
    expect(screen.getByText(/Còn 40 Lon chưa có vị trí đủ sức chứa/)).toBeInTheDocument()
    expect(screen.getByText(/đang chừa cho WINE/)).toBeInTheDocument()
    expect(screen.getByText(/Chia vào vị trí đang chứa cùng sản phẩm/)).toBeInTheDocument()
    expect(screen.getByText('A-01 sẽ gần đầy sau khi cất.')).toBeInTheDocument()
  })

  it('blocks saving and shows the over-planning message', () => {
    renderSheet({
      validation: {
        ...validValidation,
        itemErrors: new Map([['item-1', 'Chỉ còn 240 Lon chưa cất; đang cấu hình 300.']]),
        canSave: false,
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ còn 240 Lon')
    expect(screen.getByRole('button', { name: 'Lưu vị trí cất hàng' })).toBeDisabled()
  })

  it('adds a line for an item', async () => {
    const user = userEvent.setup()
    const handlers = renderSheet()

    await user.click(screen.getByRole('button', { name: 'Thêm vị trí' }))

    expect(handlers.onAddLine).toHaveBeenCalledWith('item-1')
  })
})
