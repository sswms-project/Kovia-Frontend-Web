import { describe, expect, it } from 'vitest'
import {
  activityPeriodSchema,
  activityPeriodParams,
  defaultActivityPeriod,
  resolveActivityPeriod,
} from './activity-period.schema'

const defaults = defaultActivityPeriod(new Date('2026-10-18T10:00:00Z'))
describe('warehouse activity calendar periods', () => {
  it('defaults to the Vietnamese calendar month at the UTC day boundary', () => {
    expect(defaultActivityPeriod(new Date('2026-09-30T18:00:00Z'))).toMatchObject({
      month: '2026-10',
      year: '2026',
      quarter: '4',
      dateTo: '2026-10-01',
    })
  })
  it.each([
    [
      { period: 'month', month: '2024-02' },
      { dateFrom: '2024-02-01', dateTo: '2024-02-29' },
    ],
    [
      { period: 'year', year: '2024' },
      { dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    ],
    [
      { period: 'quarter', year: '2026', quarter: '4' },
      { dateFrom: '2026-10-01', dateTo: '2026-12-31' },
    ],
    [
      { period: 'week', week: '2020-W53' },
      { dateFrom: '2020-12-28', dateTo: '2021-01-03' },
    ],
    [
      { period: 'week', week: '2026-W01' },
      { dateFrom: '2025-12-29', dateTo: '2026-01-04' },
    ],
    [
      { period: 'custom', dateFrom: '2026-10-18', dateTo: '2026-10-18' },
      { dateFrom: '2026-10-18', dateTo: '2026-10-18' },
    ],
  ])('resolves the inclusive calendar period %j', (overrides, expected) => {
    const result = activityPeriodSchema.parse({ ...defaults, ...overrides })
    expect(resolveActivityPeriod(result)).toEqual(expected)
  })
  it.each([
    { period: 'month', month: '0001-01' },
    { period: 'month', month: '2026-13' },
    { period: 'week', week: '2021-W53' },
    { period: 'week', week: '2026-W00' },
    { period: 'quarter', quarter: '5' },
    { period: 'year', year: '9999' },
    { period: 'custom', dateFrom: '2026-02-30', dateTo: '2026-03-01' },
    { period: 'custom', dateFrom: '2026-10-19', dateTo: '2026-10-18' },
    { period: 'custom', dateFrom: '2024-01-01', dateTo: '2025-01-01' },
    { period: 'custom', dateFrom: '', dateTo: '' },
  ])('rejects invalid or overlong periods %j', (overrides) => {
    expect(activityPeriodSchema.safeParse({ ...defaults, ...overrides }).success).toBe(false)
  })
  it('serializes only the applied selection and clears obsolete URL fields', () => {
    expect(activityPeriodParams({ ...defaults, period: 'quarter' })).toEqual({
      activityPeriod: 'quarter',
      activityQuarter: '4',
      activityYear: '2026',
      activityMonth: '',
      activityWeek: '',
      activityFrom: '',
      activityTo: '',
    })
  })
})
