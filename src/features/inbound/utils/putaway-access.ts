interface PutawayExecutionLockInput {
  readonly assignedTo: string | null | undefined
  readonly assignedToName: string | null | undefined
  readonly currentUserId: string | null | undefined
  readonly isPlanning: boolean
}

/**
 * Lý do khóa form ghi nhận cất hàng khi nhiệm vụ đã giao cho người khác; `null` nếu người xem
 * được phép cất (là người được giao, nhiệm vụ chưa giao ai, hoặc đang ở chế độ quản lý).
 */
export function getPutawayExecutionLockReason({
  assignedTo,
  assignedToName,
  currentUserId,
  isPlanning,
}: PutawayExecutionLockInput): string | null {
  if (isPlanning || !assignedTo || assignedTo === currentUserId) return null
  const assignee = assignedToName?.trim() || 'nhân viên khác'
  return `Nhiệm vụ cất hàng này đang giao cho ${assignee}. Chỉ người được giao mới ghi nhận cất hàng.`
}
