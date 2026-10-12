export const DAMAGE_EVIDENCE_MAX_COUNT = 3
export const DAMAGE_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024
// Chỉ ảnh JPG/PNG; capture="environment" trên điện thoại mở thẳng camera sau để chụp hàng hỏng.
export const DAMAGE_EVIDENCE_ACCEPT = 'image/jpeg,image/png'
export const DAMAGE_REASON_MAX_LENGTH = 500

export function getDamageEvidenceError(file: File, currentCount: number): string | null {
  if (currentCount >= DAMAGE_EVIDENCE_MAX_COUNT)
    return `Chỉ được đính kèm tối đa ${DAMAGE_EVIDENCE_MAX_COUNT} ảnh cho mỗi dòng.`
  if (!DAMAGE_EVIDENCE_ACCEPT.split(',').includes(file.type)) return 'Chỉ nhận ảnh JPG hoặc PNG.'
  if (file.size > DAMAGE_EVIDENCE_MAX_BYTES) return 'Mỗi ảnh tối đa 5 MB.'
  return null
}

/** Hàng hỏng chỉ được lưu khi có lý do và ít nhất một ảnh (đã lưu trước đó hoặc vừa chụp). */
export function isDamageDetailComplete(reason: string, evidenceCount: number): boolean {
  return reason.trim().length > 0 && evidenceCount > 0
}
