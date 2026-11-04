import { describe, expect, it } from 'vitest'
import { isCycleCountQuantityChanged } from './cycle-count-draft-changes'

describe('unsaved cycle count quantities', () => {
  it.each([
    ['', 3, true],
    ['abc', 3, true],
    ['-1', 3, true],
    ['3.0', 3, false],
    ['0', 0, false],
    ['', null, false],
    ['4', 3, true],
    [undefined, 3, false],
  ] as const)('compares %s against %s', (draft, saved, expected) => {
    expect(isCycleCountQuantityChanged(draft, saved)).toBe(expected)
  })
})
