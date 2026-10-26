import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SlotOption } from '../components/PutawayDetailPage'
import type { PutawayFormValues } from '../schemas/inbound.schema'
import type { GoodsReceiptDetail, PutAwaySuggestionsResponse } from '../types/inbound.types'
import { usePutawayFormSuggestions } from './use-putaway-form-suggestions'

const mutateAsync = vi.hoisted(() => vi.fn())
const autoSuggest = vi.hoisted(() => vi.fn())
vi.mock('../services/inbound.service', () => ({
  inboundService: { suggestPutawaySlots: autoSuggest },
}))
vi.mock('./use-inbound', () => ({
  usePutawayFormSuggestionsMutation: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }))

const baseUnitId = '10000000-0000-4000-8000-000000000003'
const itemId = '10000000-0000-4000-8000-000000000001'
const receipt = {
  id: 'receipt',
  items: [
    {
      id: itemId,
      inboundRequestItemId: 'request-item',
      productId: 'product',
      baseUnitId,
      enteredUnitId: baseUnitId,
      remainingPutAwayQuantity: 100,
      allowedUnits: [{ unitId: baseUnitId, conversionFactor: 1, quantityPrecision: 0 }],
    },
  ],
} as unknown as GoodsReceiptDetail

const slots: SlotOption[] = [
  { id: '10000000-0000-4000-8000-0000000000a1', code: 'A-01' },
  { id: '10000000-0000-4000-8000-0000000000b1', code: 'B-01' },
  { id: '10000000-0000-4000-8000-0000000000d1', code: 'D-01' },
  { id: '10000000-0000-4000-8000-0000000000f1', code: 'C-01', unavailableReason: 'Vị trí đã đầy' },
] as SlotOption[]

const response: PutAwaySuggestionsResponse = {
  isAiAssisted: true,
  aiNotice: null,
  summary: 'Chia vào vị trí đang chứa cùng sản phẩm.',
  risks: ['A-01 sẽ gần đầy sau khi cất.'],
  heldSlots: [],
  items: [
    {
      goodsReceiptItemId: itemId,
      remainingQuantity: 100,
      unallocatedQuantity: 0,
      suggestions: [
        '10000000-0000-4000-8000-0000000000f1',
        '10000000-0000-4000-8000-0000000000a1',
        '10000000-0000-4000-8000-0000000000f2',
      ].map((slotId) => ({
        slotId,
        slotCode: slotId,
        rackCode: 'KE',
        zoneName: 'Khu',
        score: 1,
        reason: 'ok',
        source: 'Ai' as const,
        warnings: [],
        suggestedQuantity: 0,
        availableQuantity: null,
      })),
    },
  ],
}

function setup(lines: PutawayFormValues['lines'], autoFill = false, currentReceipt = receipt) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return renderHook(
    () => {
      const form = useForm<PutawayFormValues>({ defaultValues: { lines } })
      const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
      const suggestion = usePutawayFormSuggestions({
        receipt: currentReceipt,
        form,
        append: fieldArray.append,
        slots,
        autoFill,
      })
      return { form, suggestion }
    },
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  )
}

const line = (slotId: string, quantity = 100) => ({
  goodsReceiptItemId: itemId,
  slotId,
  enteredQuantity: quantity,
  enteredUnitId: baseUnitId,
})

describe('usePutawayFormSuggestions', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    autoSuggest.mockReset()
    autoSuggest.mockResolvedValue({ data: response })
    mutateAsync.mockResolvedValue({ data: response })
  })

  it('automatically fills selectable suggestions once', async () => {
    const hook = setup([line('')], true)
    await waitFor(() =>
      expect(hook.result.current.form.getValues('lines.0.slotId')).toBe(slots[0]!.id)
    )
    hook.rerender()
    expect(autoSuggest).toHaveBeenCalledTimes(1)
  })

  it('does not request automatic suggestions when a location is already filled', () => {
    setup([line(slots[1]!.id)], true)
    expect(autoSuggest).not.toHaveBeenCalled()
  })

  it('does not request automatic suggestions when a manager plan already exists', () => {
    setup([line('')], true, {
      ...receipt,
      items: receipt.items.map((item) => ({
        ...item,
        putAwayPlan: [
          {
            id: 'plan',
            slotId: slots[1]!.id,
            slotCode: 'B',
            rackCode: 'R',
            isSystemDefaultSlot: false,
            quantity: 100,
          },
        ],
      })),
    })
    expect(autoSuggest).not.toHaveBeenCalled()
  })

  it('does not overwrite an edit made while suggestions are loading', async () => {
    let finish: (value: { data: PutAwaySuggestionsResponse }) => void = () => undefined
    autoSuggest.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const hook = setup([line('')], true)
    await waitFor(() => expect(autoSuggest).toHaveBeenCalledTimes(1))
    act(() =>
      hook.result.current.form.setValue('lines.0.slotId', slots[1]!.id, { shouldDirty: true })
    )
    await act(async () => finish({ data: response }))
    expect(hook.result.current.form.getValues('lines.0.slotId')).toBe(slots[1]!.id)
  })

  it('keeps a remainder row when a suggestion only covers part of the quantity', async () => {
    autoSuggest.mockResolvedValueOnce({
      data: {
        ...response,
        items: [
          {
            ...response.items[0]!,
            suggestions: [
              {
                ...response.items[0]!.suggestions[0]!,
                slotId: slots[0]!.id,
                suggestedQuantity: 40,
              },
            ],
            unallocatedQuantity: 60,
          },
        ],
      },
    })
    const hook = setup([line('')], true)
    await waitFor(() => expect(hook.result.current.form.getValues('lines')).toHaveLength(2))
    expect(
      hook.result.current.form
        .getValues('lines')
        .map((value) => [value.slotId, value.enteredQuantity])
    ).toEqual([
      [slots[0]!.id, 40],
      ['', 60],
    ])
  })

  it('keeps only slots the form can actually select', async () => {
    const { result } = setup([line('')])

    await act(async () => result.current.suggestion.onSuggest())

    expect(
      result.current.suggestion.suggestions?.items[0]?.suggestions.map((value) => value.slotId)
    ).toEqual(['10000000-0000-4000-8000-0000000000a1'])
  })

  it('fills the empty allocation line with the chosen slot', async () => {
    const { result } = setup([line('')])
    await act(async () => result.current.suggestion.onSuggest())

    act(() => result.current.suggestion.onApply(itemId, '10000000-0000-4000-8000-0000000000a1'))

    expect(result.current.form.getValues('lines')).toHaveLength(1)
    expect(result.current.form.getValues('lines.0.slotId')).toBe(
      '10000000-0000-4000-8000-0000000000a1'
    )
  })

  it('adds a new line with the unallocated quantity when every line already has a slot', async () => {
    const { result } = setup([line('10000000-0000-4000-8000-0000000000b1', 60)])

    act(() => result.current.suggestion.onApply(itemId, '10000000-0000-4000-8000-0000000000a1'))

    const lines = result.current.form.getValues('lines')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatchObject({
      slotId: '10000000-0000-4000-8000-0000000000a1',
      enteredQuantity: 40,
    })
  })

  it('applies the suggested split across slots with their quantities', async () => {
    const split = ['a1', 'b1', 'd1'].map((suffix, index) => ({
      ...response.items[0]!.suggestions[0]!,
      slotId: `10000000-0000-4000-8000-0000000000${suffix}`,
      suggestedQuantity: [50, 30, 20][index]!,
    }))
    mutateAsync.mockResolvedValue({
      data: { ...response, items: [{ ...response.items[0]!, suggestions: split }] },
    })
    const { result } = setup([line('')])
    await act(async () => result.current.suggestion.onSuggest())

    act(() => result.current.suggestion.onApplyBest())

    expect(
      result.current.form
        .getValues('lines')
        .map((value) => [value.slotId.slice(-2), value.enteredQuantity])
    ).toEqual([
      ['a1', 50],
      ['b1', 30],
      ['d1', 20],
    ])
  })

  it('does not duplicate a slot that is already allocated', () => {
    const { result } = setup([line('10000000-0000-4000-8000-0000000000a1')])

    act(() => result.current.suggestion.onApply(itemId, '10000000-0000-4000-8000-0000000000a1'))

    expect(result.current.form.getValues('lines')).toHaveLength(1)
  })
})
