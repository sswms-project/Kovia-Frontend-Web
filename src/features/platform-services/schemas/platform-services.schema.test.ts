import { describe, expect, it } from 'vitest'
import { notificationCreatedEventSchema } from './platform-services.schema'

const event = {
  notificationId: '10000000-0000-4000-8000-000000000001',
  type: 'InboundRequestUpdate',
  createdAt: '2026-10-23T03:39:00+00:00',
  referenceType: 'InboundRequest',
}
describe('notification Guid contract', () => {
  it.each([
    '10000000-0000-4000-c000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-7000-8000-000000000002',
  ])('accepts .NET Guid identities without requiring RFC UUID version or variant bits', (id) => {
    expect(
      notificationCreatedEventSchema.parse({ ...event, notificationId: id, referenceId: id })
        .referenceId
    ).toBe(id)
  })
  it.each(['not-a-guid', '1000000000004000c000000000000002', '<script>', '', 123])(
    'still rejects malformed reference identities',
    (referenceId) => {
      expect(notificationCreatedEventSchema.safeParse({ ...event, referenceId }).success).toBe(
        false
      )
    }
  )
  it('supports notifications without a referenced entity', () => {
    expect(notificationCreatedEventSchema.safeParse(event).success).toBe(true)
    expect(notificationCreatedEventSchema.safeParse({ ...event, referenceId: null }).success).toBe(
      true
    )
  })
})
