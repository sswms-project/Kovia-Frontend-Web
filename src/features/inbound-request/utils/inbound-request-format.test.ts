import { describe, expect, it } from 'vitest'
import {
  isPastInboundExpectedDate,
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from './inbound-request-format'

it('validates submission by Vietnam calendar day, including midnight and same-day past times', () => {
  const midnight = new Date('2026-10-25T17:01:00Z')
  expect(isPastInboundExpectedDate('2026-10-25', midnight)).toBe(true)
  expect(isPastInboundExpectedDate('2026-10-26', midnight)).toBe(false)
  expect(isPastInboundExpectedDate('2026-10-26T00:00', midnight)).toBe(false)
  expect(isPastInboundExpectedDate('2026-10-27', midnight)).toBe(false)
  expect(isPastInboundExpectedDate('', midnight)).toBe(false)
})

describe('operational filter date boundaries', () => {
  it('preserves whole-day boundaries for existing inbound and transfer callers', () => {
    expect(toOperationalDateTimeStart('2026-10-25')).toBe('2026-10-25T00:00:00+07:00')
    expect(toOperationalDateTimeEnd('2026-10-25')).toBe('2026-10-25T23:59:59.999+07:00')
  })

  it.each(['00:00', '13:45', '23:59'])(
    'preserves an explicitly selected %s minute in Vietnam',
    (time) => {
      expect(toOperationalDateTimeStart(`2026-10-25T${time}`)).toBe(`2026-10-25T${time}:00+07:00`)
      expect(toOperationalDateTimeEnd(`2026-10-25T${time}`)).toBe(`2026-10-25T${time}:59.999+07:00`)
    }
  )

  it('includes the entire last selected minute and resolves midnight to the previous UTC day', () => {
    expect(new Date(toOperationalDateTimeStart('2026-10-25T00:00')).toISOString()).toBe(
      '2026-10-24T17:00:00.000Z'
    )
    const from = Date.parse(toOperationalDateTimeStart('2026-10-25T13:45'))
    const to = Date.parse(toOperationalDateTimeEnd('2026-10-25T13:45'))
    expect(to - from).toBe(59999)
    expect(Date.parse('2026-10-25T06:45:59.999Z')).toBe(to)
    expect(Date.parse('2026-10-25T06:46:00Z')).toBeGreaterThan(to)
  })
})
