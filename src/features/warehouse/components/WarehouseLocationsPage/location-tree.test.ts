import { describe, expect, it } from 'vitest'
import type { ZoneResponse } from '@/types/warehouse'
import {
  buildWarehouseLocationTree,
  filterWarehouseLocationTree,
  flattenExpandedLocationTree,
  getExpandableLocationIds,
  matchesWarehouseLocationTreeNode,
} from './location-tree'

const zones: ZoneResponse[] = [
  {
    id: 'zone-1',
    zoneCode: 'ZA',
    zoneName: 'Khu A',
    description: 'Khu nguyên liệu',
    status: 'Active',
    racks: [
      {
        id: 'rack-1',
        rackCode: 'A',
        rackName: 'Dãy A',
        description: null,
        status: 'Active',
        storageMode: 'SlotLevel',
        slots: [
          {
            id: 'hidden',
            slotCode: '__SYSTEM_DEFAULT__',
            slotName: 'Vị trí mặc định',
            description: null,
            status: 'Vacant',
            isActive: true,
            capacity: null,
            currentOccupancy: 0,
            barcodeValue: null,
          },
          {
            id: 'slot-1',
            slotCode: 'A.01',
            slotName: 'Ô số 1',
            description: 'Gần cửa',
            status: 'Occupied',
            isActive: true,
            capacity: 10,
            currentOccupancy: 2,
            barcodeValue: null,
          },
        ],
      },
    ],
  },
]

describe('warehouse location tree', () => {
  it('counts only matching locations for export, not ancestors shown as navigation context', () => {
    const tree = filterWarehouseLocationTree(buildWarehouseLocationTree(zones), 'Gần cửa', '')
    const rows = flattenExpandedLocationTree(tree, getExpandableLocationIds(tree))
    expect(rows).toHaveLength(3)
    expect(
      rows
        .filter((node) => matchesWarehouseLocationTreeNode(node, ' GẦN CỬA ', 'Active'))
        .map((node) => node.id)
    ).toEqual(['slot-1'])
    expect(rows.filter((node) => matchesWarehouseLocationTreeNode(node, '', 'Inactive'))).toEqual(
      []
    )
  })
  it('builds the hierarchy and excludes the hidden system slot', () => {
    const tree = buildWarehouseLocationTree(zones)
    expect(tree[0]?.children[0]?.children.map((node) => node.id)).toEqual(['slot-1'])
    expect(getExpandableLocationIds(tree)).toEqual(new Set(['zone-1', 'rack-1']))
  })

  it('keeps ancestors visible when a descendant matches search', () => {
    const tree = filterWarehouseLocationTree(buildWarehouseLocationTree(zones), 'Gần cửa', '')
    expect(
      flattenExpandedLocationTree(tree, getExpandableLocationIds(tree)).map((node) => node.id)
    ).toEqual(['zone-1', 'rack-1', 'slot-1'])
  })

  it('filters slot lifecycle by isActive instead of occupancy status', () => {
    const tree = buildWarehouseLocationTree(zones)

    expect(
      flattenExpandedLocationTree(
        filterWarehouseLocationTree(tree, '', 'Active'),
        getExpandableLocationIds(tree)
      ).map((node) => node.id)
    ).toContain('slot-1')

    expect(
      flattenExpandedLocationTree(
        filterWarehouseLocationTree(tree, '', 'Inactive'),
        getExpandableLocationIds(tree)
      ).map((node) => node.id)
    ).not.toContain('slot-1')
  })

  it('collapses children when their parent is not expanded', () => {
    const tree = buildWarehouseLocationTree(zones)
    expect(flattenExpandedLocationTree(tree, new Set()).map((node) => node.id)).toEqual(['zone-1'])
  })
})
