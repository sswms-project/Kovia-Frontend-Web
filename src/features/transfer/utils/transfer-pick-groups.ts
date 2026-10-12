import type { TransferPickDetail } from '../types/transfer.types'

/** Các lần lấy cùng vị trí và lô gộp thành một dòng để nhân viên nhìn một con số "đang giữ". */
export interface PickGroup {
  readonly key: string
  /** Lần lấy đại diện (để hiển thị vị trí và lô). */
  readonly pick: TransferPickDetail
  readonly picked: number
  readonly returned: number
  readonly dispatched: number
  /** Số đang cầm chờ xuất: đã lấy trừ đã trả và đã xuất. */
  readonly held: number
}

export function groupPicks(picks: readonly TransferPickDetail[]): PickGroup[] {
  const groups = new Map<string, PickGroup>()
  for (const pick of picks) {
    const key = `${pick.inventoryStockId}:${pick.lotId ?? ''}`
    const current = groups.get(key)
    const picked = (current?.picked ?? 0) + pick.pickedQuantity
    const returned = (current?.returned ?? 0) + pick.returnedQuantity
    const dispatched = (current?.dispatched ?? 0) + pick.dispatchedQuantity
    groups.set(key, {
      key,
      pick: current?.pick ?? pick,
      picked,
      returned,
      dispatched,
      held: picked - returned - dispatched,
    })
  }
  // Vị trí đã trả hết và chưa xuất gì không còn ý nghĩa với việc đang làm nên ẩn đi.
  return [...groups.values()].filter((group) => group.held > 0 || group.dispatched > 0)
}
