import type { RackResponse, SlotResponse, ZoneResponse } from '@/types/warehouse'

export type WarehouseLocationTreeNode =
  | {
      kind: 'zone'
      id: string
      depth: 0
      zone: ZoneResponse
      children: WarehouseLocationTreeNode[]
    }
  | {
      kind: 'rack'
      id: string
      depth: 1
      zone: ZoneResponse
      rack: RackResponse
      children: WarehouseLocationTreeNode[]
    }
  | {
      kind: 'slot'
      id: string
      depth: 2
      zone: ZoneResponse
      rack: RackResponse
      slot: SlotResponse
      children: []
    }

const SYSTEM_SLOT_CODE = '__SYSTEM_DEFAULT__'

export function buildWarehouseLocationTree(zones: readonly ZoneResponse[]) {
  return zones.map<WarehouseLocationTreeNode>((zone) => ({
    kind: 'zone',
    id: zone.id,
    depth: 0,
    zone,
    children: zone.racks.map<WarehouseLocationTreeNode>((rack) => ({
      kind: 'rack',
      id: rack.id,
      depth: 1,
      zone,
      rack,
      children: rack.slots
        .filter((slot) => slot.slotCode !== SYSTEM_SLOT_CODE)
        .map<WarehouseLocationTreeNode>((slot) => ({
          kind: 'slot',
          id: slot.id,
          depth: 2,
          zone,
          rack,
          slot,
          children: [],
        })),
    })),
  }))
}

export function getExpandableLocationIds(nodes: readonly WarehouseLocationTreeNode[]) {
  const ids = new Set<string>()
  const visit = (node: WarehouseLocationTreeNode) => {
    if (node.children.length > 0) ids.add(node.id)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return ids
}

export function matchesWarehouseLocationTreeNode(
  node: WarehouseLocationTreeNode,
  searchText: string,
  lifecycleStatus: '' | 'Active' | 'Inactive'
) {
  const term = searchText.trim().toLocaleLowerCase('vi')
  const values =
    node.kind === 'zone'
      ? [node.zone.zoneCode, node.zone.zoneName, node.zone.description]
      : node.kind === 'rack'
        ? [node.rack.rackCode, node.rack.rackName, node.rack.description]
        : [node.slot.slotCode, node.slot.slotName, node.slot.description]
  const status =
    node.kind === 'zone'
      ? node.zone.status
      : node.kind === 'rack'
        ? node.rack.status
        : node.slot.isActive
          ? 'Active'
          : 'Inactive'
  return (
    (!lifecycleStatus || status === lifecycleStatus) &&
    (!term || values.some((value) => value?.toLocaleLowerCase('vi').includes(term)))
  )
}

export function filterWarehouseLocationTree(
  nodes: readonly WarehouseLocationTreeNode[],
  searchText: string,
  lifecycleStatus: '' | 'Active' | 'Inactive'
) {
  const filterNode = (node: WarehouseLocationTreeNode): WarehouseLocationTreeNode | null => {
    const children = node.children
      .map(filterNode)
      .filter((child): child is WarehouseLocationTreeNode => child !== null)
    if (
      !matchesWarehouseLocationTreeNode(node, searchText, lifecycleStatus) &&
      children.length === 0
    )
      return null
    return { ...node, children } as WarehouseLocationTreeNode
  }

  return nodes.map(filterNode).filter((node): node is WarehouseLocationTreeNode => node !== null)
}

export function flattenExpandedLocationTree(
  nodes: readonly WarehouseLocationTreeNode[],
  expandedIds: ReadonlySet<string>
) {
  const rows: WarehouseLocationTreeNode[] = []
  const visit = (node: WarehouseLocationTreeNode) => {
    rows.push(node)
    if (expandedIds.has(node.id)) node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return rows
}
