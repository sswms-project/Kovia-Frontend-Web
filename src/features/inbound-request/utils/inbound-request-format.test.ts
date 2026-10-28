import { describe, expect, it } from 'vitest'
import {
  isPastInboundExpectedDate,
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
  toInboundRequestSaveRequest,
  toOperationalDateApiValue,
} from './inbound-request-format'
import { toOperationalDateTimeInput } from '@/lib/operational-date-time'
import type { InboundRequestFormValues } from '../schemas/inbound-request.schema'

const formValues: InboundRequestFormValues = {
  inboundRequestCode: 'NK000015',
  warehouseId: 'warehouse',
  sourceType: 'Supplier',
  supplierId: 'supplier',
  sourceName: '',
  sourceReference: '',
  expectedDate: '2026-10-28T14:35',
  lines: [{ productId: 'product', quantity: 1, unitId: '' }],
}

it('saves the selected expected minute in Vietnam time and hydrates it without dropping time', () => {
  const saved = toInboundRequestSaveRequest(formValues)
  expect(saved.expectedDate).toBe('2026-10-28T14:35:00+07:00')
  expect(toOperationalDateTimeInput(saved.expectedDate)).toBe(formValues.expectedDate)
  expect(toOperationalDateTimeInput('2026-10-28T07:35:00Z')).toBe(formValues.expectedDate)
})

it('preserves original seconds/precision when editing other fields, but uses the edited minute', () => {
  const original = '2026-10-28T07:35:12.1234567Z'
  expect(toInboundRequestSaveRequest(formValues, original).expectedDate).toBe(original)
  expect(
    toInboundRequestSaveRequest({ ...formValues, expectedDate: '2026-10-28T15:00' }, original)
      .expectedDate
  ).toBe('2026-10-28T15:00:00+07:00')
})

it('keeps date-only/no-time selections and legacy timestamps valid without changing supplier response mapping', () => {
  const expectedDate = '2026-10-28'
  const saved = toInboundRequestSaveRequest({ ...formValues, expectedDate }).expectedDate
  expect(saved).toBe('2026-10-28T23:59:59.999+07:00')
  expect(toOperationalDateTimeInput(saved)).toBe(expectedDate)
  const legacy = '2026-10-28T00:00:00Z'
  expect(
    toInboundRequestSaveRequest(
      { ...formValues, expectedDate: toOperationalDateTimeInput(legacy) },
      legacy
    ).expectedDate
  ).toBe(legacy)
  expect(toOperationalDateApiValue(expectedDate)).toBe('2026-10-28T00:00:00.000Z')
})

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
