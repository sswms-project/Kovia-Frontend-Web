import type { WarehouseLayoutSceneResponse } from '../types/warehouse-layout-scene.types'

export function locationScene(): WarehouseLayoutSceneResponse {
  return {
    warehouseId: 'warehouse-a',
    version: 1,
    canvas: { width: 1200, height: 800, gridSize: 20 },
    decorations: [],
    zones: [
      {
        id: 'zone-a',
        zoneCode: 'Z1',
        zoneName: 'Khu 1',
        status: 'Active',
        x: 20,
        y: 20,
        width: 800,
        height: 600,
        rotation: 0,
        zIndex: 0,
      },
    ],
    racks: [
      {
        id: 'rack-a',
        zoneId: 'zone-a',
        zoneCode: 'Z1',
        rackCode: 'R1',
        rackName: 'Kệ 1',
        description: null,
        status: 'Active',
        storageMode: 'SlotLevel',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 90,
        zIndex: 1,
      },
    ],
    slots: [
      {
        id: 'slot-a',
        zoneId: 'zone-a',
        rackId: 'rack-a',
        slotCode: 'S1',
        slotName: 'Ô 1',
        description: null,
        occupancyStatus: 'Occupied',
        isActive: true,
        capacity: null,
        currentOccupancy: 0,
      },
    ],
  }
}
