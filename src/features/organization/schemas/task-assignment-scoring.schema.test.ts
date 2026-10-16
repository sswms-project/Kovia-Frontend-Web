import { describe, expect, it } from 'vitest'
import { taskAssignmentScoringFormSchema } from './task-assignment-scoring.schema'

const defaults = {
  receivingBase: 3,
  putAwayBase: 3,
  warehouseTaskBase: 2,
  cycleCountBase: 3,
  pointsPerLine: 1,
  pointsPerQuantityLog: 2,
  urgentMultiplier: 1.5,
}

describe('taskAssignmentScoringFormSchema', () => {
  it('accepts the system defaults and numeric strings from inputs', () => {
    const result = taskAssignmentScoringFormSchema.safeParse({ ...defaults, pointsPerLine: '2.5' })
    expect(result.success).toBe(true)
    expect(result.data?.pointsPerLine).toBe(2.5)
  })

  it.each([
    ['receivingBase', 51],
    ['pointsPerLine', 21],
    ['pointsPerQuantityLog', -1],
    ['urgentMultiplier', 0.9],
    ['urgentMultiplier', 5.1],
    ['cycleCountBase', 1.234],
    ['putAwayBase', ''],
  ])('rejects %s = %s', (field, value) => {
    const result = taskAssignmentScoringFormSchema.safeParse({ ...defaults, [field]: value })
    expect(result.success).toBe(false)
  })
})
