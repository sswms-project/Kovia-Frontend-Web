import { describe, expect, it } from 'vitest'
import {
  formatOperationalOptionalTime,
  isOperationalDateTimeInput,
  toOperationalDateTimeApi,
  toOperationalDateTimeInput,
} from './operational-date-time'

describe('operational date/time', () => {
  it('keeps legacy end-of-day dates separate from explicitly selected midnight', () => {
    expect(toOperationalDateTimeInput('2026-10-20T23:59:59.999+07:00')).toBe('2026-10-20')
    expect(formatOperationalOptionalTime('2026-10-20T16:59:59.999Z')).toBe('20/10/2026')
    expect(formatOperationalOptionalTime('2026-10-20T00:00:00+07:00')).toBe('20/10/2026 00:00')
  })
  it('preserves an untouched timestamp byte for byte', () => {
    const original = '2026-10-20T01:23:45.1234567Z'
    expect(toOperationalDateTimeApi(toOperationalDateTimeInput(original), original)).toBe(original)
    expect(toOperationalDateTimeApi('2026-10-21')).toBe('2026-10-21T23:59:59.999+07:00')
    expect(toOperationalDateTimeApi('2026-10-21T00:00')).toBe('2026-10-21T00:00:00+07:00')
    expect(toOperationalDateTimeApi('')).toBeNull()
  })
  it('rejects invalid calendar dates and time values', () => {
    expect(isOperationalDateTimeInput('2026-02-30')).toBe(false)
    expect(isOperationalDateTimeInput('2026-10-20T25:00')).toBe(false)
    expect(isOperationalDateTimeInput('2026-10-20T09:30')).toBe(true)
  })
})
