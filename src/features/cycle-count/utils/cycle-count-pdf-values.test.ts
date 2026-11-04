import { describe, expect, it } from 'vitest'
import type { CycleCountItem } from '../types/cycle-count.types'
import { cycleCountPdfValues } from './cycle-count-pdf-values'

describe('cycle count PDF values', () => {
  it('keeps blind quantities hidden even if difference is supplied', () => {
    const row = {
      systemQuantity: null,
      countedQuantity: 3,
      countedDamagedQuantity: 1,
      difference: 2,
    } as CycleCountItem
    expect(cycleCountPdfValues(row)).toMatchObject({
      systemQuantity: null,
      hidden: true,
      surplus: null,
      shortage: null,
      countedQuantity: 3,
      damagedQuantity: 1,
    })
  })
  it('preserves a real zero and splits a negative variance', () => {
    const row = {
      systemQuantity: 5,
      countedQuantity: 0,
      countedDamagedQuantity: 0,
      difference: -5,
    } as CycleCountItem
    expect(cycleCountPdfValues(row)).toMatchObject({
      systemQuantity: 5,
      countedQuantity: 0,
      surplus: 0,
      shortage: 5,
      hidden: false,
    })
  })
})
