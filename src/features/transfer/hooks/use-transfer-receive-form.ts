'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import {
  createTransferReceiptSchema,
  type TransferReceiptFormValues,
} from '../schemas/transfer-fulfillment.schema'
import type { TransferReceiveSheet } from '../types/transfer.types'
import {
  buildExpectedReceiptQuantities,
  buildInitialReceiptEntries,
  removeReceiptEntry,
  toReceiveRequest,
} from '../utils/transfer-receive'
import { describeTransferError } from '../utils/transfer-errors'
import { codesMatch } from '../utils/transfer-scan'
import { useTransferActionRunner } from './use-transfer-action-runner'
import {
  useFindReceivableSlotMutation,
  useReceiveTransferShipmentMutation,
} from './use-transfer-fulfillment'

/** Trạng thái màn nhận hàng: một hàng khai báo cho mỗi dòng/lô, có thể chia nhiều vị trí đến. */
export function useTransferReceiveForm(
  transferId: string,
  shipmentId: string,
  sheet: TransferReceiveSheet | undefined
) {
  const run = useTransferActionRunner()
  const expectedRef = useRef<ReadonlyMap<string, number>>(new Map())
  const hydratedVersion = useRef<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const form = useForm<TransferReceiptFormValues>({
    resolver: (values, context, options) =>
      zodResolver(createTransferReceiptSchema(expectedRef.current))(values, context, options),
    defaultValues: { entries: [] },
  })
  const entries = useFieldArray({ control: form.control, name: 'entries' })
  const findSlotMutation = useFindReceivableSlotMutation()
  const receiveMutation = useReceiveTransferShipmentMutation()
  // Đường dẫn "Khu / Kệ / Ô" của vị trí đã quét, để thẻ hiển thị tên đầy đủ thay vì chữ vừa gõ.
  const [slotPathById, setSlotPathById] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!sheet) return
    expectedRef.current = buildExpectedReceiptQuantities(sheet)
    if (hydratedVersion.current === (sheet.version ?? '')) return
    hydratedVersion.current = sheet.version ?? ''
    form.reset({ entries: buildInitialReceiptEntries(sheet) })
  }, [form, sheet])

  const lineById = useMemo(
    () => new Map((sheet?.lines ?? []).map((line) => [line.lineId, line])),
    [sheet?.lines]
  )

  async function scanSlot(index: number, code: string): Promise<boolean> {
    if (!sheet) return false
    try {
      const slot = await findSlotMutation.mutateAsync({
        warehouseId: sheet.destinationWarehouseId,
        scannedCode: code,
      })
      if (!slot) {
        form.setValue(`entries.${index}.destinationSlotId`, '')
        form.setValue(`entries.${index}.scannedSlotCode`, '')
        form.setError(`entries.${index}.scannedSlotCode`, {
          message: `Mã ${code} không khớp vị trí đang hoạt động nào của kho nhập.`,
        })
        return false
      }
      form.clearErrors(`entries.${index}.scannedSlotCode`)
      setSlotPathById((current) => ({ ...current, [slot.id]: slot.path }))
      form.setValue(`entries.${index}.destinationSlotId`, slot.id, { shouldDirty: true })
      form.setValue(`entries.${index}.scannedSlotCode`, code, { shouldDirty: true })
      return true
    } catch (error) {
      form.setValue(`entries.${index}.destinationSlotId`, '')
      form.setValue(`entries.${index}.scannedSlotCode`, '')
      form.setError(`entries.${index}.scannedSlotCode`, {
        message: describeTransferError(
          error,
          'Không tra được vị trí. Hãy kiểm tra kết nối rồi quét lại.'
        ).message,
      })
      return false
    }
  }

  function scanProduct(index: number, code: string): boolean {
    const entry = form.getValues(`entries.${index}`)
    const line = lineById.get(entry.lineId)
    if (!line) return false
    if (!codesMatch(code, line.sku, line.productBarcode)) {
      form.setValue(`entries.${index}.scannedProductCode`, '')
      form.setError(`entries.${index}.scannedProductCode`, {
        message: `Mã hàng ${code} không khớp với ${line.sku}.`,
      })
      return false
    }
    form.clearErrors(`entries.${index}.scannedProductCode`)
    form.setValue(`entries.${index}.scannedProductCode`, code, { shouldDirty: true })
    return true
  }

  function splitEntry(index: number) {
    const entry = form.getValues(`entries.${index}`)
    entries.insert(index + 1, {
      ...entry,
      destinationSlotId: '',
      scannedSlotCode: '',
      goodQuantity: 0,
      damagedQuantity: 0,
      missingQuantity: 0,
      reasonCode: '',
      note: '',
    })
  }

  function countEntriesOf(index: number) {
    const target = form.getValues(`entries.${index}`)
    return form
      .getValues('entries')
      .filter((entry) => entry.lineId === target.lineId && entry.lotId === target.lotId).length
  }

  async function confirm() {
    if (!sheet?.version) return
    const values = form.getValues()
    const done = await run(
      () =>
        receiveMutation.mutateAsync({
          transferId,
          shipmentId,
          request: toReceiveRequest(values, sheet.version ?? ''),
        }),
      'Đã nhận đợt hàng, tồn kho đã được cập nhật.',
      'Không thể nhận đợt hàng.'
    )
    if (done) setIsConfirmOpen(false)
  }

  return {
    form,
    fields: entries.fields,
    lineById,
    slotPathById,
    isFindingSlot: findSlotMutation.isPending,
    isReceiving: receiveMutation.isPending,
    isConfirmOpen,
    setIsConfirmOpen,
    scanSlot,
    scanProduct,
    splitEntry,
    removeEntry: (index: number) =>
      entries.replace(removeReceiptEntry(form.getValues('entries'), index)),
    countEntriesOf,
    reset: () => {
      hydratedVersion.current = null
      if (sheet) form.reset({ entries: buildInitialReceiptEntries(sheet) })
    },
    requestConfirm: form.handleSubmit(() => setIsConfirmOpen(true)),
    confirm,
  }
}
