import { parseCountQuantity } from '../schemas/cycle-count.schema'

/** Invalid or cleared input is still an edit, even though it cannot be saved yet. */
export function isCycleCountQuantityChanged(draft: string | undefined, saved: number | null) {
  if (draft === undefined) return false
  const value = parseCountQuantity(draft)
  if (value !== null) return value !== saved
  return draft.trim() !== '' || saved !== null
}
