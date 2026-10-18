import { describe, expect, it } from 'vitest'
import {
  expiryDaysSchema,
  stockExpiryAlertsSchema,
  stockThresholdAlertsSchema,
} from './stock-alert.schema'

const page = {
  generatedAt: '2026-10-17T12:00:00+00:00',
  appliedWarehouseIds: [],
  totalCount: 0,
  pageNumber: 1,
  pageSize: 10,
  items: [],
}

describe('stock alert contracts', () => {
  it('accepts both threshold kinds and configured-policy metadata', () => {
    expect(
      stockThresholdAlertsSchema.parse({ ...page, kind: 'below-minimum', configuredPolicyCount: 0 })
        .configuredPolicyCount
    ).toBe(0)
    expect(
      stockThresholdAlertsSchema.safeParse({
        ...page,
        kind: 'above-maximum',
        configuredPolicyCount: 1,
      }).success
    ).toBe(true)
  })
  it('does not accept a missing policy count or expiry group in a threshold response', () => {
    expect(stockThresholdAlertsSchema.safeParse({ ...page, kind: 'below-minimum' }).success).toBe(
      false
    )
    expect(
      stockThresholdAlertsSchema.safeParse({ ...page, kind: 'expired', configuredPolicyCount: 1 })
        .success
    ).toBe(false)
  })
  it('keeps the UTC evaluation date and nullable days for expired stock', () => {
    const data = {
      ...page,
      kind: 'expired',
      evaluationDate: '2026-10-17',
      timeBasis: 'UTC',
      expiringDays: null,
    }
    expect(stockExpiryAlertsSchema.parse(data).evaluationDate).toBe('2026-10-17')
    expect(stockExpiryAlertsSchema.safeParse({ ...data, timeBasis: 'local' }).success).toBe(false)
  })
  it.each([0, 366, 1.2, Number.NaN])('rejects an invalid expiry-day setting: %s', (days) => {
    expect(expiryDaysSchema.safeParse({ days }).success).toBe(false)
  })
  it.each([1, 5, 365])('accepts an expiry-day setting: %s', (days) => {
    expect(expiryDaysSchema.safeParse({ days }).success).toBe(true)
  })
})
