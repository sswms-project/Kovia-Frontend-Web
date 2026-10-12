import { describe, expect, it } from 'vitest'
import { createTransferPutawayPlanSchema } from '../schemas/transfer-putaway-plan.schema'
import { buildTransferItem } from './transfer-test-fixtures'
import { planLine, SLOT_A, SLOT_B } from './transfer-plan-test-fixtures'
import {
  applyTransferPlanSuggestions,
  buildTransferPlanDraft,
  planTotalFromRemaining,
  reconcileTransferPlanDraft,
} from './transfer-putaway-plan'

const item = buildTransferItem({
  quantity: 10,
  stoppedQuantity: 1,
  putAwayPlan: [planLine()],
  baseQuantityPrecision: 2,
})
const schema = createTransferPutawayPlanSchema([item], new Map())
const payload = (lines = [{ slotId: SLOT_A, plannedTotal: 6 }]) => ({
  expectedVersion: 'v1',
  items: [{ itemId: item.id, lines }],
})
describe('transfer putaway plan', () => {
  it('stores totals rather than remaining and never silently rounds invalid precision', () => {
    expect(planTotalFromRemaining(2, 4)).toBe(6)
    expect(planTotalFromRemaining(0.1, 0.2)).toBe(0.3)
    expect(planTotalFromRemaining(2, 0.001)).toBe(2.001)
    expect(schema.safeParse(payload()).success).toBe(true)
    expect(schema.safeParse(payload([{ slotId: SLOT_A, plannedTotal: 2.001 }])).success).toBe(false)
  })
  it('rejects dropping received slots, reducing below received and exceeding quantity minus stopped', () => {
    for (const lines of [
      [],
      [{ slotId: SLOT_A, plannedTotal: 1 }],
      [{ slotId: SLOT_A, plannedTotal: 10 }],
      [{ slotId: SLOT_A, plannedTotal: 0 }],
    ])
      expect(schema.safeParse(payload(lines)).success).toBe(false)
    expect(schema.safeParse(payload([{ slotId: SLOT_A, plannedTotal: 2 }])).success).toBe(true)
  })
  it('allows clearing an unreceived plan, rejects duplicate slots/items and more than twenty positions', () => {
    const freshSchema = createTransferPutawayPlanSchema([buildTransferItem()], new Map())
    expect(freshSchema.safeParse(payload([])).success).toBe(true)
    expect(
      schema.safeParse(
        payload([
          { slotId: SLOT_A, plannedTotal: 3 },
          { slotId: SLOT_A, plannedTotal: 3 },
        ])
      ).success
    ).toBe(false)
    expect(
      schema.safeParse({ ...payload(), items: [payload().items[0], payload().items[0]] }).success
    ).toBe(false)
    expect(
      schema.safeParse(
        payload(
          Array.from({ length: 21 }, (_, i) => ({
            slotId: `80000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
            plannedTotal: 1,
          }))
        )
      ).success
    ).toBe(false)
  })
  it('uses base UOM precision without requiring permission to view the units directory', () => {
    const integerSchema = createTransferPutawayPlanSchema(
      [{ ...item, baseQuantityPrecision: 0 }],
      new Map()
    )
    expect(integerSchema.safeParse(payload([{ slotId: SLOT_A, plannedTotal: 2.5 }])).success).toBe(
      false
    )
  })
  it('locks received locations that were outside the original plan', () => {
    const fresh = {
      ...item,
      receivedPutAwayLocations: [{ slotId: SLOT_B, path: 'B01', receivedQuantity: 1 }],
    }
    const draft = buildTransferPlanDraft([fresh])
    expect(draft[0]?.lines).toContainEqual({ slotId: SLOT_B, path: 'B01', plannedTotal: 1 })
    expect(createTransferPutawayPlanSchema([fresh], new Map()).safeParse(payload()).success).toBe(
      false
    )
    expect(reconcileTransferPlanDraft(buildTransferPlanDraft([item]), [fresh])[0]?.lines).toEqual(
      draft[0]?.lines
    )
  })
  it('applies suggestions to draft only and preserves the locked received minimum', () => {
    const draft = buildTransferPlanDraft([item])
    const suggestions = {
      items: [
        {
          itemId: item.id,
          remaining: 7,
          unallocatedQuantity: 0,
          suggestions: [
            {
              slotId: SLOT_B,
              slotCode: 'B01',
              rackCode: 'B',
              zoneName: 'B',
              path: 'B01',
              suggestedQuantity: 99,
              available: null,
              reason: 'Còn chỗ',
              warnings: [],
            },
          ],
        },
      ],
      isAiAssisted: false,
      notice: null,
      summary: null,
      risks: [],
    }
    const next = applyTransferPlanSuggestions(draft, [item], suggestions)
    expect(next[0]?.lines).toEqual([
      { slotId: SLOT_A, plannedTotal: 2, path: planLine().path },
      { slotId: SLOT_B, plannedTotal: 7, path: 'B01' },
    ])
    expect(draft[0]?.lines[0]?.plannedTotal).toBe(6)
  })
})
