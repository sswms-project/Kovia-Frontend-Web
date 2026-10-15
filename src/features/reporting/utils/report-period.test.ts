import { describe, expect, it } from 'vitest'
import { reportMonthPeriod } from './report-period'

describe('warehouse reporting periods in Vietnam', () => {
  it('uses the local date when UTC is still in the preceding month', () => {
    expect(reportMonthPeriod(false, new Date('2026-09-30T18:00:00Z'))).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-01',
    })
  })
  it('crosses the year boundary for the previous month', () => {
    expect(reportMonthPeriod(true, new Date('2026-01-05T00:00:00Z'))).toEqual({
      dateFrom: '2025-12-01',
      dateTo: '2025-12-31',
    })
  })
  it('includes leap day when reporting on February', () => {
    expect(reportMonthPeriod(true, new Date('2024-03-08T00:00:00Z'))).toEqual({
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    })
  })
})
