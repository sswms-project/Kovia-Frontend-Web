'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  createTransferCountSchema,
  type TransferCountFormValues,
} from '../schemas/transfer-receipt.schema'
import type {
  SubmitTransferReceiptRequest,
  TransferReceiptSheet,
} from '../types/transfer-receipt.types'
import { describeTransferError } from '../utils/transfer-errors'
import { newCommandId } from '../utils/transfer-command-id'
import { useSubmitTransferReceiptMutation } from './use-transfer-receipt'

function initialCounts(sheet: TransferReceiptSheet): TransferCountFormValues {
  const submitted = Boolean(sheet.receiptSubmittedAt)
  return {
    entries: sheet.lines.flatMap((line) =>
      line.lots.map((lot) => ({
        lineId: line.lineId,
        lotId: lot.lotId,
        goodQuantity: submitted ? lot.initialGoodQuantity : lot.dispatchedQuantity,
        damagedQuantity: submitted ? lot.initialDamagedQuantity : 0,
        missingQuantity: submitted ? lot.initialMissingQuantity : 0,
        reasonCode: '',
        note: '',
      }))
    ),
  }
}

export function useTransferCountForm(sheet: TransferReceiptSheet | undefined, canAct: boolean) {
  const snapshot = useRef<TransferReceiptSheet | null>(null)
  const lock = useRef(false)
  const writeBlocked = useRef(false)
  const intent = useRef<SubmitTransferReceiptRequest | null>(null)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [unknownResult, setUnknownResult] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = useSubmitTransferReceiptMutation()
  const form = useForm<TransferCountFormValues>({
    defaultValues: { entries: [] },
    resolver: (values, context, options) =>
      zodResolver(createTransferCountSchema(snapshot.current))(values, context, options),
  })
  const fields = useFieldArray({ control: form.control, name: 'entries' }).fields
  useEffect(() => {
    if (!sheet) return
    if (!snapshot.current || snapshot.current.shipmentId !== sheet.shipmentId) {
      snapshot.current = sheet
      form.reset(initialCounts(sheet))
    } else if (
      snapshot.current.version !== sheet.version ||
      snapshot.current.status !== sheet.status
    ) {
      writeBlocked.current = true
      setReloadRequired(true)
      setConfirmOpen(false)
      setNotice('Phiếu đã thay đổi. Tải lại để đối chiếu; số lượng đang nhập được giữ lại.')
    }
  }, [sheet, form])
  const blocked = !canAct || reloadRequired || unknownResult || mutation.isPending

  async function send(request: SubmitTransferReceiptRequest) {
    const current = snapshot.current
    if (!current || lock.current) return false
    lock.current = true
    try {
      await mutation.mutateAsync({
        transferId: current.transferId,
        shipmentId: current.shipmentId,
        request,
      })
      intent.current = null
      writeBlocked.current = true
      setUnknownResult(false)
      setReloadRequired(true)
      setNotice(
        'Đã nộp phiếu kiểm hàng. Chỉ hàng tốt được chuyển sang cất; hàng hỏng, thiếu được xử lý riêng. Tồn kho chưa thay đổi.'
      )
      toast.success('Đã nộp phiếu kiểm hàng.')
      return true
    } catch (error) {
      const result = describeTransferError(error, 'Không thể nộp phiếu kiểm hàng.')
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
    fields,
    blocked,
    notice,
    reloadRequired,
    unknownResult,
    confirmOpen,
    isPending: mutation.isPending,
    setConfirmOpen,
    requestConfirm: () =>
      form.handleSubmit(() => {
        if (!blocked && !lock.current) setConfirmOpen(true)
      })(),
    confirm: async () => {
      if (
        blocked ||
        writeBlocked.current ||
        lock.current ||
        !snapshot.current?.version ||
        !(await form.trigger())
      )
        return false
      if (blocked || writeBlocked.current || lock.current) return false
      const request: SubmitTransferReceiptRequest = {
        expectedVersion: snapshot.current.version,
        commandId: newCommandId(),
        entries: form.getValues('entries').map((entry) => ({
          ...entry,
          reasonCode: entry.reasonCode || null,
          note: entry.note || null,
        })),
      }
      intent.current = request
      return send(request)
    },
    retryUnknown: () =>
      unknownResult && intent.current && canAct ? send(intent.current) : Promise.resolve(false),
    acceptFresh: (fresh: TransferReceiptSheet) => {
      if (lock.current) return
      snapshot.current = fresh
      setConfirmOpen(false)
      if (fresh.receiptSubmittedAt) {
        form.reset(initialCounts(fresh))
        intent.current = null
        setUnknownResult(false)
      }
      setReloadRequired(false)
      writeBlocked.current = Boolean(unknownResult && intent.current)
      setNotice(
        fresh.receiptSubmittedAt
          ? 'Phiếu kiểm hàng đã được ghi nhận; xem số đã nhận và chuyển sang cất hàng.'
          : 'Đã tải phiếu mới. Số lượng đang nhập được giữ lại; kiểm tra trước khi nộp.'
      )
      if (!fresh.receiptSubmittedAt) void form.trigger()
    },
  }
}
