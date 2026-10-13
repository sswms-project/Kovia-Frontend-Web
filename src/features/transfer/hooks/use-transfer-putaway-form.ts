'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import {
  createTransferPutAwaySchema,
  type TransferPutAwayFormValues,
} from '../schemas/transfer-putaway.schema'
import type {
  PutAwayTransferShipmentRequest,
  TransferPutAwaySheet,
} from '../types/transfer-receipt.types'
import {
  buildTransferPutAwayEntries,
  putAwayRowKey,
  splitTransferPutAwayExcess,
  transferPutAwayPlanStates,
} from '../utils/transfer-putaway'
import { describeTransferError } from '../utils/transfer-errors'
import { newCommandId } from '../utils/transfer-command-id'
import { codesMatch } from '../utils/transfer-scan'
import { useFindReceivableSlotMutation } from './use-transfer-fulfillment'
import { usePutAwayTransferShipmentMutation } from './use-transfer-receipt'

export function useTransferPutAwayForm(
  sheet: TransferPutAwaySheet | undefined,
  warehouseId: string,
  canAct: boolean
) {
  const snapshot = useRef<TransferPutAwaySheet | null>(null)
  const lock = useRef(false)
  const writeBlocked = useRef(false)
  const scanLock = useRef(false)
  const intent = useRef<PutAwayTransferShipmentRequest | null>(null)
  const lastWriteSucceeded = useRef(false)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [unknownResult, setUnknownResult] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [changedLines, setChangedLines] = useState<ReadonlySet<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = usePutAwayTransferShipmentMutation()
  const findSlot = useFindReceivableSlotMutation()
  const form = useForm<TransferPutAwayFormValues>({
    defaultValues: { entries: [] },
    resolver: (values, context, options) =>
      zodResolver(createTransferPutAwaySchema(snapshot.current))(values, context, options),
  })
  const fields = useFieldArray({ control: form.control, name: 'entries' })
  useEffect(() => {
    if (!sheet) return
    if (!snapshot.current || snapshot.current.receipt.shipmentId !== sheet.receipt.shipmentId) {
      snapshot.current = sheet
      form.reset({ entries: buildTransferPutAwayEntries(sheet) })
    } else if (
      snapshot.current.receipt.version !== sheet.receipt.version ||
      snapshot.current.planVersion !== sheet.planVersion
    ) {
      writeBlocked.current = true
      setReloadRequired(true)
      setConfirmOpen(false)
      setNotice(
        'Phiếu hoặc kế hoạch đã thay đổi. Tải lại để đối chiếu; số lượng đang nhập được giữ lại.'
      )
    }
  }, [form, sheet])
  const blocked =
    !canAct || reloadRequired || unknownResult || mutation.isPending || findSlot.isPending
  const canEdit = () =>
    canAct &&
    !writeBlocked.current &&
    !reloadRequired &&
    !unknownResult &&
    !lock.current &&
    !scanLock.current

  async function send(request: PutAwayTransferShipmentRequest) {
    if (!snapshot.current || lock.current || scanLock.current) return false
    lock.current = true
    try {
      await mutation.mutateAsync({
        transferId: snapshot.current.receipt.transferId,
        shipmentId: snapshot.current.receipt.shipmentId,
        request,
      })
      intent.current = null
      lastWriteSucceeded.current = true
      writeBlocked.current = true
      setUnknownResult(false)
      setReloadRequired(true)
      setNotice('Đã ghi nhận cất hàng. Tải phiếu mới để tiếp tục phần còn lại.')
      toast.success('Đã cất hàng; tồn kho nhận đã được cập nhật.')
      return true
    } catch (error) {
      const result = describeTransferError(error, 'Không thể cất hàng điều chuyển.')
      setNotice(result.message)
      toast.error(result.message)
      if (result.kind === 'unknown-result') {
        writeBlocked.current = true
        setUnknownResult(true)
      } else {
        intent.current = null
        if (result.kind === 'conflict') {
          writeBlocked.current = true
          setReloadRequired(true)
        }
      }
      return false
    } finally {
      lock.current = false
      setConfirmOpen(false)
    }
  }

  return {
    form,
    fields: fields.fields,
    blocked,
    notice,
    changedLines,
    reloadRequired,
    unknownResult,
    confirmOpen,
    setConfirmOpen,
    isPending: mutation.isPending,
    isFindingSlot: findSlot.isPending,
    requestConfirm: () =>
      form.handleSubmit(() => {
        if (canEdit()) setConfirmOpen(true)
      })(),
    confirm: async () => {
      if (!canEdit() || !snapshot.current?.receipt.version || !(await form.trigger())) return false
      if (!canEdit()) return false
      const current = snapshot.current
      const request: PutAwayTransferShipmentRequest = {
        expectedVersion: current.receipt.version ?? '',
        commandId: newCommandId(),
        planVersion: current.planVersion,
        entries: form
          .getValues('entries')
          .filter((entry) => entry.quantity > 0)
          .map((entry) => ({
            lineId: entry.lineId,
            lotId: entry.lotId,
            qualityStatus: entry.qualityStatus,
            destinationSlotId: entry.destinationSlotId,
            quantity: entry.quantity,
            scannedSlotCode: entry.slotCodeUnreadable ? null : entry.scannedSlotCode || null,
            scannedProductCode: entry.scannedProductCode || null,
            deviationReasonCode: entry.deviationReasonCode || null,
            note: entry.note || null,
            slotCodeUnreadable: entry.slotCodeUnreadable,
          })),
      }
      intent.current = request
      return send(request)
    },
    retryUnknown: () =>
      unknownResult && intent.current && canAct ? send(intent.current) : Promise.resolve(false),
    acceptFresh: (fresh: TransferPutAwaySheet) => {
      if (lock.current || scanLock.current) return
      const previous = snapshot.current
      const fingerprint = (source: TransferPutAwaySheet, lineId: string) =>
        JSON.stringify(
          source.rows
            .filter((row) => row.lineId === lineId)
            .map((row) => [
              row.qualityStatus,
              row.lotId,
              row.planMode,
              row.planBudgets,
              row.remainingQuantity,
            ])
        )
      setChangedLines(
        new Set(
          fresh.rows
            .filter(
              (row) =>
                previous && fingerprint(previous, row.lineId) !== fingerprint(fresh, row.lineId)
            )
            .map((row) => row.lineId)
        )
      )
      snapshot.current = fresh
      setConfirmOpen(false)
      if (lastWriteSucceeded.current || fresh.receipt.status !== 'AwaitingPutAway') {
        form.reset({ entries: buildTransferPutAwayEntries(fresh) })
        intent.current = null
        setUnknownResult(false)
        lastWriteSucceeded.current = false
      }
      setReloadRequired(false)
      writeBlocked.current = Boolean(unknownResult && intent.current)
      setNotice(
        unknownResult && intent.current
          ? 'Kết quả vẫn chưa rõ. Kiểm tra lại đúng thao tác trước đó; không nhập lại như một lần cất mới.'
          : 'Đã tải phiếu mới. Kiểm tra phần còn lại và các dòng được đánh dấu.'
      )
      if (fresh.receipt.status === 'AwaitingPutAway') void form.trigger()
    },
    applyPlan: () => {
      if (canEdit() && snapshot.current) {
        form.reset({ entries: buildTransferPutAwayEntries(snapshot.current) })
        setChangedLines(new Set())
      }
    },
    split: (index: number) => {
      if (!canEdit()) return
      const entry = form.getValues(`entries.${index}`)
      if (entry)
        fields.insert(index + 1, {
          ...entry,
          quantity: 0,
          destinationSlotId: '',
          slotLabel: '',
          plannedSlotId: '',
          plannedSlotLabel: '',
          scannedSlotCode: '',
          scannedProductCode: '',
          slotCodeUnreadable: false,
          deviationReasonCode: '',
          note: '',
        })
    },
    remove: (index: number) => {
      if (canEdit()) fields.remove(index)
    },
    splitExcess: (index: number) => {
      if (!canEdit() || !snapshot.current) return
      const entries = form.getValues('entries')
      const state = transferPutAwayPlanStates(snapshot.current, entries)[index]
      if (state) fields.replace(splitTransferPutAwayExcess(entries, index, state))
    },
    markUnreadable: (index: number, option: LookupOption | null) => {
      if (!canEdit()) return
      form.setValue(`entries.${index}.slotCodeUnreadable`, Boolean(option), { shouldDirty: true })
      form.setValue(`entries.${index}.destinationSlotId`, option?.value ?? '', {
        shouldDirty: true,
      })
      form.setValue(`entries.${index}.slotLabel`, option?.label ?? '', { shouldDirty: true })
      form.setValue(`entries.${index}.scannedSlotCode`, '', { shouldDirty: true })
      form.setValue(`entries.${index}.deviationReasonCode`, '', { shouldDirty: true })
    },
    scanSlot: async (index: number, code: string) => {
      if (!canEdit() || !warehouseId) return false
      scanLock.current = true
      form.setValue(`entries.${index}.scannedSlotCode`, '', { shouldDirty: true })
      try {
        const slot = await findSlot.mutateAsync({ warehouseId, scannedCode: code })
        if (!slot) {
          form.setError(`entries.${index}.scannedSlotCode`, {
            message: 'Mã vị trí không khớp vị trí đang hoạt động nào của kho nhập.',
          })
          return false
        }
        form.clearErrors(`entries.${index}.scannedSlotCode`)
        form.setValue(`entries.${index}.destinationSlotId`, slot.id, { shouldDirty: true })
        form.setValue(`entries.${index}.slotLabel`, slot.path, { shouldDirty: true })
        form.setValue(`entries.${index}.scannedSlotCode`, code, { shouldDirty: true })
        form.setValue(`entries.${index}.slotCodeUnreadable`, false, { shouldDirty: true })
        return true
      } catch (error) {
        form.setError(`entries.${index}.scannedSlotCode`, {
          message: describeTransferError(error, 'Không tra được vị trí; hãy quét lại.').message,
        })
        return false
      } finally {
        scanLock.current = false
      }
    },
    scanProduct: (index: number, code: string) => {
      if (!canEdit()) return false
      const entry = form.getValues(`entries.${index}`)
      form.setValue(`entries.${index}.scannedProductCode`, '', { shouldDirty: true })
      const line = snapshot.current?.receipt.lines.find((line) => line.lineId === entry?.lineId)
      if (!line || !codesMatch(code, line.sku, line.barcode)) {
        form.setError(`entries.${index}.scannedProductCode`, {
          message: 'Mã hàng không khớp sản phẩm của dòng đang cất.',
        })
        return false
      }
      form.clearErrors(`entries.${index}.scannedProductCode`)
      form.setValue(`entries.${index}.scannedProductCode`, code, { shouldDirty: true })
      return true
    },
    rowOf: (index: number) => {
      const entry = form.getValues(`entries.${index}`)
      return sheet?.rows.find((row) => entry && putAwayRowKey(row) === putAwayRowKey(entry))
    },
  }
}
