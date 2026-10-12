import { useState } from 'react'
import { getDamageEvidenceError } from '../utils/cycle-count-damage'

export interface DamageEvidenceFile {
  readonly id: string
  readonly fileName: string
}

// Chỉ giữ trạng thái giao diện của việc tải ảnh; việc gọi API do trang truyền vào qua onUpload.
export function useDamageEvidenceUpload(
  onUpload: (file: File) => Promise<DamageEvidenceFile | null>
) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File, currentCount: number): Promise<DamageEvidenceFile | null> {
    const validationError = getDamageEvidenceError(file, currentCount)
    setError(validationError)
    if (validationError) return null
    setIsUploading(true)
    try {
      return await onUpload(file)
    } finally {
      setIsUploading(false)
    }
  }

  return { isUploading, error, upload }
}
