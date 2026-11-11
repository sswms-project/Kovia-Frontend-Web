import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/axios', () => ({ axiosClient: { get: (...args: unknown[]) => get(...args) } }))

import { inboundService } from '../../services/inbound.service'
import { formatReceivingLocationLabel } from './ReceivingLocationPicker'

const base = { id: 's1', zoneCode: 'Z', rackCode: 'R', slotCode: 'S', displayPath: 'Z / R / S' }

describe('formatReceivingLocationLabel (BUG-019)', () => {
  it('keeps the plain path when the slot has no quantity capacity', () => {
    expect(formatReceivingLocationLabel(base)).toBe('Z / R / S')
  })

  it('appends remaining capacity with vi-VN grouping and unit', () => {
    expect(
      formatReceivingLocationLabel({
        ...base,
        remainingCapacity: 1200,
        capacityUnitSymbol: 'thùng',
      })
    ).toBe('Z / R / S · còn 1.200 thùng')
  })

  it('shows zero for a full slot', () => {
    expect(formatReceivingLocationLabel({ ...base, remainingCapacity: 0 })).toBe(
      'Z / R / S · còn 0'
    )
  })
})

describe('inboundService.receivingLocations selectedSlotId (BUG-019)', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: { data: { items: [], totalCount: 0 } } })
  })

  it('sends the saved slot so BE returns it as the suggested location', async () => {
    await inboundService.receivingLocations('w1', '', 1, undefined, false, 'slot-9')
    expect(get.mock.calls[0]?.[1].params).toEqual({
      warehouseId: 'w1',
      searchTerm: '',
      pageNumber: 1,
      selectedSlotId: 'slot-9',
    })
  })

  it('omits selectedSlotId when there is no saved slot', async () => {
    await inboundService.receivingLocations('w1', '', 1)
    expect(get.mock.calls[0]?.[1].params).not.toHaveProperty('selectedSlotId')
  })
})
