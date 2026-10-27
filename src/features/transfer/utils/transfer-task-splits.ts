import type { TaskSplitSource, TaskSplitStateResponse } from '@/features/task-splitting'
import type { TransferShipment } from '../types/transfer.types'
import type { ShipmentCapabilities } from './transfer-capabilities'

export interface TransferTaskSplitSource extends TaskSplitSource {
  readonly kind: 'pick' | 'receive' | 'putaway'
}

const CLOSED_TASK_STATUSES: readonly (string | null | undefined)[] = ['Completed', 'Cancelled']

/** The shipment's open pick/receive/put-away tasks, each a split source keyed by its warehouse task id. */
export function getTransferTaskSplitSources(shipment: TransferShipment): TransferTaskSplitSource[] {
  const tasks = [
    {
      kind: 'pick',
      type: 'TransferPick',
      sourceId: shipment.pickTaskId,
      status: shipment.pickTaskStatus,
    },
    {
      kind: 'receive',
      type: 'TransferReceive',
      sourceId: shipment.receiveTaskId,
      status: shipment.receiveTaskStatus,
    },
    {
      kind: 'putaway',
      type: 'TransferPutAway',
      sourceId: shipment.putAwayTaskId,
      status: shipment.putAwayTaskStatus,
    },
  ] as const
  return tasks.flatMap(({ kind, type, sourceId, status }) =>
    sourceId && !CLOSED_TASK_STATUSES.includes(status) ? [{ kind, type, sourceId }] : []
  )
}

/** A split task is handed out per part: its single assignee is no longer offered, splitting is. */
export function applyTaskSplits(
  allowed: ShipmentCapabilities,
  shipment: TransferShipment,
  states: Readonly<Record<string, TaskSplitStateResponse | undefined>>
): ShipmentCapabilities {
  const stateOf = (taskId: string | null | undefined) => (taskId ? states[taskId] : undefined)
  const pick = stateOf(shipment.pickTaskId)
  const receive = stateOf(shipment.receiveTaskId)
  const putAway = stateOf(shipment.putAwayTaskId)
  return {
    ...allowed,
    canAssignPick: allowed.canAssignPick && !pick?.isSplit,
    canAssignReceive: allowed.canAssignReceive && !receive?.isSplit,
    canAssignPutAway: allowed.canAssignPutAway && !putAway?.isSplit,
    canSplitPick: pick?.canSplit === true,
    canSplitReceive: receive?.canSplit === true,
    canSplitPutAway: putAway?.canSplit === true,
  }
}
