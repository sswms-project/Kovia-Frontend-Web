'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import {
  changedReceivePlanLines,
  receiptPlanStates,
  splitReceiptExcess,
} from '../utils/transfer-receive-plan'
import { describeTransferError } from '../utils/transfer-errors'
import { codesMatch } from '../utils/transfer-scan'
import {
  useFindReceivableSlotMutation,
  useReceiveTransferShipmentMutation,
} from './use-transfer-fulfillment'

/** Nháp và token là một snapshot; refetch không được tự nâng token trong khi giữ dữ liệu cũ. */
export function useTransferReceiveForm(
  transferId: string,
  shipmentId: string,
  sheet: TransferReceiveSheet | undefined,
  canAct = true
) {
  const snapshot = useRef<TransferReceiveSheet | null>(null)
  const writeLock = useRef(false)
  const scanLock = useRef(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [changedLines, setChangedLines] = useState<ReadonlySet<string>>(new Set())
  const form = useForm<TransferReceiptFormValues>({
    resolver: (values, context, options) =>
      zodResolver(
        createTransferReceiptSchema(
          snapshot.current ? buildExpectedReceiptQuantities(snapshot.current) : new Map(),
          snapshot.current ?? undefined
        )
      )(values, context, options),
    defaultValues: { entries: [] },
  })
  const entries = useFieldArray({ control: form.control, name: 'entries' })
  const findSlotMutation = useFindReceivableSlotMutation()
  const receiveMutation = useReceiveTransferShipmentMutation()
  const [slotPathById, setSlotPathById] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!sheet) return
    const old = snapshot.current
    if (!old || old.shipmentId !== sheet.shipmentId) {
      snapshot.current = sheet
      form.reset({ entries: buildInitialReceiptEntries(sheet) })
      setReloadRequired(false)
      setNotice(null)
      setChangedLines(new Set())
      setSlotPathById({})
    } else if (old.version !== sheet.version || old.planVersion !== sheet.planVersion) {
      setReloadRequired(true)
      setNotice(
        'Phiếu hoặc kế hoạch đã thay đổi. Tải lại để đối chiếu; số lượng đang nhập sẽ được giữ lại.'
      )
    }
  }, [form, sheet])

  const lineById = useMemo(
    () => new Map((sheet?.lines ?? []).map((line) => [line.lineId, line])),
    [sheet?.lines]
  )
  const blocked = !canAct || reloadRequired || receiveMutation.isPending
  const mayEdit = () => canAct && !reloadRequired && !writeLock.current && !scanLock.current

  async function scanSlot(index: number, code: string): Promise<boolean> {
    if (!sheet || !mayEdit()) return false
    const origin = form.getValues(`entries.${index}`)
    if (!origin) return false
    scanLock.current = true
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
      // Quét ô trong kế hoạch chuyển xác nhận tới đúng phân bổ chưa quét của cùng dòng/lô.
      const target = form
        .getValues('entries')
        .findIndex(
          (entry) =>
            entry.lineId === origin.lineId &&
            entry.lotId === origin.lotId &&
            entry.destinationSlotId === slot.id &&
            !entry.scannedSlotCode
        )
      const position = target >= 0 ? target : index
      form.clearErrors(`entries.${position}.scannedSlotCode`)
      setSlotPathById((current) => ({ ...current, [slot.id]: slot.path }))
      form.setValue(`entries.${position}.destinationSlotId`, slot.id, { shouldDirty: true })
      form.setValue(`entries.${position}.scannedSlotCode`, code, { shouldDirty: true })
      return true
    } catch (error) {
      // Tra cứu thất bại không tự xóa vị trí kế hoạch, nhưng không được giữ xác nhận của mã cũ.
      form.setValue(`entries.${index}.scannedSlotCode`, '')
      form.setError(`entries.${index}.scannedSlotCode`, {
        message: describeTransferError(
          error,
          'Không tra được vị trí. Hãy kiểm tra kết nối rồi quét lại.'
        ).message,
      })
      return false
    } finally {
      scanLock.current = false
    }
  }

  function scanProduct(index: number, code: string): boolean {
    if (!mayEdit()) return false
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
    if (!mayEdit()) return
    const entry = form.getValues(`entries.${index}`)
    entries.insert(index + 1, {
      ...entry,
      plannedSlotId: '',
      plannedSlotLabel: '',
      destinationSlotId: '',
      scannedSlotCode: '',
      goodQuantity: 0,
      damagedQuantity: 0,
      missingQuantity: 0,
      reasonCode: '',
      deviationReasonCode: '',
      note: '',
    })
  }

  async function confirm() {
    if (!snapshot.current?.version || !mayEdit()) return
    if (
      snapshot.current.lines.some((line) => line.planMode === 'Planned') &&
      !snapshot.current.planVersion
    ) {
      setNotice('Thiếu phiên bản kế hoạch. Tải lại phiếu nhận trước khi xác nhận.')
      setReloadRequired(true)
      return
    }
    if (!(await form.trigger())) {
      setIsConfirmOpen(false)
      return
    }
    if (!mayEdit()) return
    writeLock.current = true
    try {
      await receiveMutation.mutateAsync({
        transferId,
        shipmentId,
        request: toReceiveRequest(
          form.getValues(),
          snapshot.current.version,
          snapshot.current.planVersion
        ),
      })
      setIsConfirmOpen(false)
      toast.success('Đã nhận đợt hàng, tồn kho đã được cập nhật.')
    } catch (error) {
      setIsConfirmOpen(false)
      const result = describeTransferError(error, 'Không thể nhận đợt hàng.')
      setNotice(
        result.kind === 'unknown-result'
          ? 'Chưa xác định được kết quả nhận hàng. Tải lại để kiểm tra trước khi thao tác tiếp; số lượng đang nhập được giữ lại.'
          : result.message
      )
      if (result.kind !== 'rejected') setReloadRequired(true)
    } finally {
      writeLock.current = false
    }
  }

  return {
    form,
    fields: entries.fields,
    lineById,
    slotPathById,
    blocked,
    reloadRequired,
    notice,
    changedLines,
    isFindingSlot: findSlotMutation.isPending,
    isReceiving: receiveMutation.isPending,
    isConfirmOpen,
    setIsConfirmOpen,
    scanSlot,
    scanProduct,
    splitEntry,
    confirm,
    countEntriesOf: (index: number) => {
      const target = form.getValues(`entries.${index}`)
      return form
        .getValues('entries')
        .filter((entry) => entry.lineId === target.lineId && entry.lotId === target.lotId).length
    },
    removeEntry: (index: number) => {
      if (mayEdit()) entries.replace(removeReceiptEntry(form.getValues('entries'), index))
    },
    splitExcess: (index: number) => {
      if (mayEdit() && snapshot.current) {
        const values = form.getValues('entries')
        const state = receiptPlanStates(snapshot.current, values)[index]
        if (state) entries.replace(splitReceiptExcess(values, index, state))
      }
    },
    applyPlan: () => {
      if (mayEdit() && snapshot.current) {
        entries.replace(buildInitialReceiptEntries(snapshot.current))
        setChangedLines(new Set())
      }
    },
    acceptFresh: (fresh: TransferReceiveSheet) => {
      if (writeLock.current || scanLock.current) return
      if (snapshot.current) setChangedLines(changedReceivePlanLines(snapshot.current, fresh))
      snapshot.current = fresh
      // Không reset form: số lượng, ghi chú và vị trí đã quét vẫn còn để đối chiếu.
      setReloadRequired(false)
      setIsConfirmOpen(false)
      setNotice(
        'Đã tải phiếu mới. Nội dung đang nhập được giữ lại; kiểm tra các dòng được đánh dấu trước khi xác nhận.'
      )
      void form.trigger()
    },
    requestConfirm: () =>
      form.handleSubmit(() => {
        if (mayEdit()) setIsConfirmOpen(true)
      })(),
  }
}
