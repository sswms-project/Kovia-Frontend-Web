import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { inventoryService } from '@/features/inventory/services/inventory.service'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import {
  legacyReceiptStockSchema,
  legacyReceiptEvidenceFileSchema,
  type LegacyReceiptStockValues,
} from '../schemas/legacy-receipt-stock.schema'
import type { GoodsReceiptDetail } from '../types/inbound.types'
import { useReconcileLegacyReceiptStockMutation } from './use-inbound'
import { useReceivingLocationSelection } from './use-receiving-location-selection'

export function useLegacyReceiptStock(
  receipt: GoodsReceiptDetail | undefined,
  selfApprovalRequired: boolean
) {
  const [target, setTarget] = useState<GoodsReceiptDetail | null>(null)
  const [uploading, setUploading] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [attachmentNames, setAttachmentNames] = useState<string[]>([])
  const generation = useRef(0)
  const submitLock = useRef(false)
  const mutation = useReconcileLegacyReceiptStockMutation()
  const form = useForm<LegacyReceiptStockValues>({
    resolver: zodResolver(legacyReceiptStockSchema),
    defaultValues: { reason: '', lines: [], evidenceIds: [], selfApprovalAcknowledged: false },
  })
  const source = useReceivingLocationSelection(
    target?.warehouseId,
    `${target?.id}:${target?.version}`,
    !!target
  )
  useEffect(
    () => () => {
      generation.current += 1
    },
    []
  )
  function open() {
    if (!receipt || submitLock.current || uploading) return
    generation.current += 1
    setTarget(receipt)
    setAttachmentNames([])
    form.reset({
      reason: '',
      evidenceIds: [],
      selfApprovalAcknowledged: false,
      lines: receipt.items.map((item) => ({
        goodsReceiptItemId: item.id,
        actualHoldQuantity: Number.NaN,
      })),
    })
    mutation.reset()
  }
  function close() {
    if (submitLock.current || uploading) return
    if (form.formState.isDirty || attachmentNames.length > 0 || source.selected) {
      setDiscardOpen(true)
      return
    }
    discard()
  }
  function discard() {
    if (submitLock.current || uploading) return
    generation.current += 1
    setDiscardOpen(false)
    source.choose('')
    setTarget(null)
  }
  async function upload(file: File) {
    if (!target || uploading || submitLock.current || form.getValues('evidenceIds').length >= 5)
      return
    const parsedFile = legacyReceiptEvidenceFileSchema.safeParse(file)
    if (!parsedFile.success) {
      toast.error(parsedFile.error.issues[0]?.message ?? 'Tệp được chọn không hợp lệ.')
      return
    }
    const current = generation.current
    setUploading(true)
    try {
      const result = await inventoryService.uploadEvidence(target.warehouseId, file)
      if (generation.current === current) {
        form.setValue('evidenceIds', [...form.getValues('evidenceIds'), result.data.id], {
          shouldValidate: true,
        })
        setAttachmentNames((names) => [...names, result.data.fileName])
      }
    } catch (error) {
      logger.warn(getApiErrorMessage(error))
      if (generation.current === current)
        toast.error(getApiErrorMessage(error, 'Không thể tải bằng chứng.'))
    } finally {
      if (generation.current === current) setUploading(false)
    }
  }
  async function confirm() {
    await form.handleSubmit(async (values) => {
      if (!target || target.id !== receipt?.id || submitLock.current || uploading) return
      if (!source.selected || source.query.isError || source.query.isFetching) {
        toast.error('Vui lòng chọn vị trí thực tế nhận hàng.')
        return
      }
      if (selfApprovalRequired && !values.selfApprovalAcknowledged) {
        form.setError('selfApprovalAcknowledged', {
          message: 'Cần xác nhận rõ hành động tự phê duyệt.',
        })
        return
      }
      submitLock.current = true
      const current = generation.current
      try {
        await mutation.mutateAsync({
          receiptId: target.id,
          request: {
            ...values,
            expectedVersion: target.version,
            receivingSlotId: source.selected.id,
          },
        })
        if (generation.current === current) {
          setTarget(null)
          toast.success('Đã đối soát và ghi nhận phần tồn thực nhận có bằng chứng.')
        }
      } catch (error) {
        if (generation.current === current)
          toast.error(getApiErrorMessage(error, 'Không thể đối soát tồn thực nhận.'))
      } finally {
        submitLock.current = false
      }
    })()
  }
  return {
    target,
    form,
    source,
    uploading,
    attachmentNames,
    mutation,
    open,
    close,
    upload,
    confirm,
    selfApprovalRequired,
    discardOpen,
    setDiscardOpen,
    discard,
  }
}
