import { expect, it } from 'vitest'
import type { ZoneResponse } from '@/types/warehouse'
import { getPutawaySlotOptions } from './putaway-slot-options'

it('excludes both rack-level and slot-level isolation points from good-stock manual placement', () => {
  const zone: ZoneResponse = {
    id: 'zone',
    zoneCode: 'K01',
    zoneName: 'Khu 1',
    description: null,
    status: 'Active',
    racks: [
      {
        id: 'isolated-rack',
        rackCode: 'CL',
        rackName: 'Cách ly',
        description: null,
        status: 'Active',
        storageMode: 'RackLevel',
        isIsolationPoint: true,
        defaultSlotId: 'isolated-default',
        slots: [],
      },
      {
        id: 'normal-rack',
        rackCode: 'A',
        rackName: 'Kệ A',
        description: null,
        status: 'Active',
        storageMode: 'SlotLevel',
        slots: [
          {
            id: 'isolated-slot',
            slotCode: 'CL-1',
            slotName: 'Cách ly',
            description: null,
            status: 'Vacant',
            isActive: true,
            isIsolationPoint: true,
            capacity: null,
            currentOccupancy: 0,
            barcodeValue: null,
          },
          {
            id: 'normal-slot',
            slotCode: 'A-1',
            slotName: 'Lưu trữ',
            description: null,
            status: 'Vacant',
            isActive: true,
            capacity: null,
            currentOccupancy: 0,
            barcodeValue: null,
          },
        ],
      },
      {
        id: 'normal-rack-level',
        rackCode: 'B',
        rackName: 'Kệ B',
        description: null,
        status: 'Active',
        storageMode: 'RackLevel',
        defaultSlotId: 'normal-default',
        slots: [],
      },
    ],
  }
  expect(getPutawaySlotOptions([zone]).map((slot) => slot.id)).toEqual([
    'normal-slot',
    'normal-default',
  ])
})
