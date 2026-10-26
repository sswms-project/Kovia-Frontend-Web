import { useRef, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { legacyReceiptEvidenceFileSchema } from '../schemas/legacy-receipt-stock.schema'
import { inboundService } from '../services/inbound.service'

export function useRefusalEvidence(warehouseId: string | undefined, sessionKey: string) {
  const key = `${warehouseId}:${sessionKey}`
  const [record, setRecord] = useState<{
    key: string
    files: { id: string; fileName: string }[]
    acknowledged: boolean
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  const files = record?.key === key ? record.files : []
  const acknowledged = record?.key === key && record.acknowledged
  async function upload(file: File) {
    if (!warehouseId || lock.current || files.length >= 5) return
    const result = legacyReceiptEvidenceFileSchema.safeParse(file)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Tệp không hợp lệ.')
      return
    }
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const uploaded = await inboundService.uploadReceivingEvidence(warehouseId, file)
      if (uploaded.data.warehouseId !== warehouseId)
        throw new Error('Bằng chứng không thuộc kho đang thao tác.')
      setRecord((previous) => ({
        key,
        files: [...(previous?.key === key ? previous.files : []), uploaded.data],
        acknowledged: previous?.key === key && previous.acknowledged,
      }))
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Không thể tải bằng chứng.'))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function payload(required: boolean) {
    if (!required) return {}
    if (!acknowledged || files.length === 0 || busy)
      throw new Error(
        'Xác nhận bên giao giữ/mang về hàng từ chối và đính kèm bằng chứng trước khi gửi.'
      )
    return { refusedGoodsHandedBack: true, refusalEvidenceIds: files.map((file) => file.id) }
  }
  return {
    files,
    acknowledged,
    busy,
    error,
    upload,
    payload,
    toggle: () => {
      if (!lock.current) setRecord({ key, files, acknowledged: !acknowledged })
    },
    remove: (id: string) => {
      if (!lock.current)
        setRecord({ key, files: files.filter((file) => file.id !== id), acknowledged })
    },
  }
}
