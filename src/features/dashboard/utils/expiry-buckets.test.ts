import { describe, expect, it } from 'vitest'
import { toExpiryBuckets } from './expiry-buckets'

describe('toExpiryBuckets', () => {
  it('groups lots by days left and clips the last bucket to the selected window', () => {
    const buckets = toExpiryBuckets(
      [
        { daysToExpiry: 0, lotCount: 2 },
        { daysToExpiry: 2, lotCount: 1 },
        { daysToExpiry: 3, lotCount: 4 },
        { daysToExpiry: 5, lotCount: 1 },
      ],
      5
    )
    expect(buckets.map(({ label, lotCount }) => [label, lotCount])).toEqual([
      ['Hôm nay', 2],
      ['1–3 ngày', 5],
      ['4–5 ngày', 1],
    ])
  })

  it('keeps empty buckets so the chart axis stays stable', () => {
    expect(toExpiryBuckets([], 1).map(({ label, lotCount }) => [label, lotCount])).toEqual([
      ['Hôm nay', 0],
      ['1 ngày', 0],
    ])
  })
})
