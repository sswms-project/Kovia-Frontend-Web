import type { RackPosition } from '../../utils/layout-rack-operations'

export interface RackEditingControls {
  readonly singleRackId?: string
  readonly ids: readonly string[]
  readonly referenceId: string | null
  readonly snapObjects: boolean
  readonly locked: boolean
  readonly onSelectionChange: (ids: readonly string[], referenceId: string | null) => void
  readonly onGestureChange: (active: boolean) => void
  readonly onCommit: (positions: readonly RackPosition[]) => void
  readonly onError: (message: string) => void
}
