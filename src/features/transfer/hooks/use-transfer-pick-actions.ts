'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useReducer, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  transferPickEscalateSchema,
  transferPickReturnSchema,
  transferPickSwitchSchema,
  type TransferPickEscalateFormValues,
  type TransferPickReturnFormValues,
  type TransferPickSwitchFormValues,
} from '../schemas/transfer-fulfillment.schema'
import type {
  TransferPickAlternative,
  TransferPickDetail,
  TransferPickSheet,
  TransferPickSheetLine,
} from '../types/transfer.types'
import { useScanPreferences } from '../utils/scan-preferences'
import { newCommandId } from '../utils/transfer-command-id'
import {
  INITIAL_PICK_SCAN_STATE,
  getDefaultPickQuantity,
  isNonFefoChoice,
  nextEachUnitQuantity,
  pickScanReducer,
  validatePickQuantity,
} from '../utils/transfer-scan'
import { useTransferActionRunner } from './use-transfer-action-runner'
import {
  useCompleteTransferPickingMutation,
  useEscalateTransferPickMutation,
  useRecordTransferPickMutation,
  useReturnTransferPickMutation,
  useSwitchTransferPickMutation,
  useTransferPickAlternativesQuery,
} from './use-transfer-fulfillment'

const EMPTY_SWITCH: TransferPickSwitchFormValues = {
  toInventoryStockId: '',
  quantity: 1,
  reasonCode: 'InsufficientAtLocation',
  note: '',
}

const EMPTY_ESCALATE: TransferPickEscalateFormValues = { reasonCode: 'NotFound', note: '' }

function outstandingOf(pick: TransferPickDetail) {
  return pick.pickedQuantity - pick.returnedQuantity - pick.dispatchedQuantity
}

/** Toàn bộ trạng thái thao tác của màn lấy hàng: quét mã, đổi vị trí/lô, báo quản lý, trả hàng, xuất đợt. */
export function useTransferPickActions(
  transferId: string,
  shipmentId: string,
  sheet: TransferPickSheet | undefined
) {
  const run = useTransferActionRunner()
  const [scanPreferences] = useScanPreferences()
  const eachUnit = scanPreferences.eachUnit

  const [entryLine, setEntryLine] = useState<TransferPickSheetLine | null>(null)
  const [scan, dispatchScan] = useReducer(pickScanReducer, INITIAL_PICK_SCAN_STATE)
  const [quantityOverride, setQuantityOverride] = useState<number | null>(null)
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [switchLine, setSwitchLine] = useState<TransferPickSheetLine | null>(null)
  const [escalateLine, setEscalateLine] = useState<TransferPickSheetLine | null>(null)
  const [returnLine, setReturnLine] = useState<TransferPickSheetLine | null>(null)
  const [returnScanError, setReturnScanError] = useState<string | null>(null)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  // Một mã cho mỗi lần mở hộp thoại: bấm lại khi mạng chậm gửi cùng mã nên BE không ghi hai lần.
  const commandIds = useRef({ pick: '', switch: '', escalate: '', return: '' })

  const switchForm = useForm<TransferPickSwitchFormValues>({
    resolver: zodResolver(transferPickSwitchSchema),
    defaultValues: EMPTY_SWITCH,
  })
  const escalateForm = useForm<TransferPickEscalateFormValues>({
    resolver: zodResolver(transferPickEscalateSchema),
    defaultValues: EMPTY_ESCALATE,
  })
  const returnForm = useForm<TransferPickReturnFormValues>({
    resolver: zodResolver(transferPickReturnSchema),
    defaultValues: { pickDetailId: '', quantity: 1, scannedSlotCode: '' },
  })

  const alternativeLine = entryLine ?? switchLine
  const alternativesQuery = useTransferPickAlternativesQuery(
    transferId,
    shipmentId,
    alternativeLine?.lineId ?? null
  )
  const alternatives = useMemo(() => alternativesQuery.data ?? [], [alternativesQuery.data])

  const recordMutation = useRecordTransferPickMutation()
  const switchMutation = useSwitchTransferPickMutation()
  const escalateMutation = useEscalateTransferPickMutation()
  const returnMutation = useReturnTransferPickMutation()
  const completeMutation = useCompleteTransferPickingMutation()

  const suggestion = scan.suggestion
  const maximumQuantity =
    suggestion && entryLine
      ? Math.min(suggestion.suggestedQuantity, entryLine.remainingQuantity)
      : 0
  const quantity =
    quantityOverride ??
    (suggestion && entryLine ? getDefaultPickQuantity(suggestion, entryLine) : 0)

  const watchedSwitchTarget = useWatch({ control: switchForm.control, name: 'toInventoryStockId' })
  const chosenAlternative = alternatives.find(
    (alternative) => alternative.inventoryStockId === watchedSwitchTarget
  )
  const isNonFefo = chosenAlternative ? isNonFefoChoice(chosenAlternative, alternatives) : false

  function openSwitch(line: TransferPickSheetLine, preset?: TransferPickAlternative) {
    const from = line.suggestions[0]
    switchForm.reset({
      ...EMPTY_SWITCH,
      toInventoryStockId: preset?.inventoryStockId ?? '',
      quantity: Math.max(
        0,
        Math.min(line.remainingQuantity, from?.suggestedQuantity ?? line.remainingQuantity)
      ),
      reasonCode: preset ? 'InsufficientAtLocation' : EMPTY_SWITCH.reasonCode,
    })
    commandIds.current.switch = newCommandId()
    setSwitchLine(line)
  }

  return {
    alternativesLoading: alternativesQuery.isLoading,
    entry: {
      line: entryLine,
      scan,
      quantity,
      maximumQuantity,
      quantityError,
      isPending: recordMutation.isPending,
      open: (line: TransferPickSheetLine) => {
        dispatchScan({ type: 'reset' })
        setQuantityOverride(null)
        setQuantityError(null)
        commandIds.current.pick = newCommandId()
        setEntryLine(line)
      },
      onOpenChange: (open: boolean) => !open && setEntryLine(null),
      eachUnit,
      scanSlot: (code: string) => {
        if (!entryLine) return false
        // Quét từng đơn vị: số lượng bắt đầu từ 0 và tăng 1 sau mỗi lần quét mã hàng.
        setQuantityOverride(eachUnit ? 0 : null)
        setQuantityError(null)
        const action = {
          type: 'scan-slot' as const,
          code,
          suggestions: entryLine.suggestions,
          alternatives,
          line: entryLine,
        }
        const next = pickScanReducer(scan, action)
        dispatchScan(action)
        return !next.error
      },
      scanProduct: (code: string) => {
        if (!entryLine) return false
        const action = { type: 'scan-product' as const, code, line: entryLine }
        const next = pickScanReducer(scan, action)
        if (next.error) {
          dispatchScan(action)
          return false
        }
        if (eachUnit) {
          const nextQuantity = nextEachUnitQuantity(scan.step, quantity, maximumQuantity)
          if (nextQuantity === null) {
            setQuantityError(`Đã đủ ${maximumQuantity} ${entryLine.baseUnitName} tại vị trí này.`)
            return false
          }
          setQuantityOverride(nextQuantity)
          setQuantityError(null)
        }
        dispatchScan(action)
        return true
      },
      changeQuantity: (value: number) => {
        setQuantityOverride(value)
        setQuantityError(null)
      },
      rescan: () => {
        dispatchScan({ type: 'reset' })
        setQuantityOverride(null)
        setQuantityError(null)
      },
      useAlternative: (alternative: TransferPickAlternative) => {
        const line = entryLine
        setEntryLine(null)
        if (line) openSwitch(line, alternative)
      },
      confirm: async () => {
        if (!entryLine || !suggestion) return
        const problem = validatePickQuantity(quantity, maximumQuantity)
        if (problem) return setQuantityError(problem)
        const done = await run(
          () =>
            recordMutation.mutateAsync({
              transferId,
              shipmentId,
              request: {
                commandId: commandIds.current.pick,
                lineId: entryLine.lineId,
                inventoryStockId: suggestion.inventoryStockId,
                quantity,
                scannedSlotCode: scan.slotCode,
                scannedProductCode: scan.productCode || null,
              },
            }),
          `Đã ghi nhận lấy ${quantity} ${entryLine.baseUnitName} ${entryLine.sku}.`,
          'Không thể ghi nhận lấy hàng.'
        )
        if (done) setEntryLine(null)
      },
    },
    switch: {
      line: switchLine,
      form: switchForm,
      alternatives: alternatives.filter(
        (alternative) =>
          alternative.inventoryStockId !== switchLine?.suggestions[0]?.inventoryStockId
      ),
      isNonFefo,
      isPending: switchMutation.isPending,
      open: openSwitch,
      onOpenChange: (open: boolean) => !open && setSwitchLine(null),
      submit: async (values: TransferPickSwitchFormValues) => {
        const from = switchLine?.suggestions[0]
        if (!switchLine || !from) return
        const done = await run(
          () =>
            switchMutation.mutateAsync({
              transferId,
              shipmentId,
              lineId: switchLine.lineId,
              request: {
                commandId: commandIds.current.switch,
                fromInventoryStockId: from.inventoryStockId,
                toInventoryStockId: values.toInventoryStockId,
                quantity: values.quantity,
                reasonCode: values.reasonCode,
                note: values.note || null,
              },
            }),
          'Đã đổi vị trí/lô lấy hàng; giữ chỗ được chuyển sang vị trí mới.',
          'Không thể đổi vị trí/lô.'
        )
        if (done) setSwitchLine(null)
      },
    },
    escalate: {
      line: escalateLine,
      form: escalateForm,
      isPending: escalateMutation.isPending,
      open: (line: TransferPickSheetLine) => {
        escalateForm.reset(EMPTY_ESCALATE)
        commandIds.current.escalate = newCommandId()
        setEscalateLine(line)
      },
      onOpenChange: (open: boolean) => !open && setEscalateLine(null),
      submit: async (values: TransferPickEscalateFormValues) => {
        if (!escalateLine) return
        const done = await run(
          () =>
            escalateMutation.mutateAsync({
              transferId,
              shipmentId,
              lineId: escalateLine.lineId,
              request: {
                commandId: commandIds.current.escalate,
                reasonCode: values.reasonCode,
                note: values.note,
              },
            }),
          'Đã báo quản lý. Bạn có thể tiếp tục các dòng khác.',
          'Không thể báo quản lý.'
        )
        if (done) setEscalateLine(null)
      },
    },
    returnPick: {
      line: returnLine,
      form: returnForm,
      picks: (returnLine?.picks ?? []).filter((pick) => outstandingOf(pick) > 0),
      scanError: returnScanError,
      isPending: returnMutation.isPending,
      open: (line: TransferPickSheetLine) => {
        const picks = line.picks.filter((pick) => outstandingOf(pick) > 0)
        const first = picks[0]
        returnForm.reset({
          pickDetailId: first?.id ?? '',
          quantity: first
            ? Math.min(outstandingOf(first), line.pendingReturnQuantity || outstandingOf(first))
            : 1,
          scannedSlotCode: '',
        })
        setReturnScanError(null)
        commandIds.current.return = newCommandId()
        setReturnLine(line)
      },
      onOpenChange: (open: boolean) => !open && setReturnLine(null),
      scanSlot: (code: string) => {
        setReturnScanError(null)
        returnForm.setValue('scannedSlotCode', code.trim(), { shouldValidate: true })
      },
      submit: async (values: TransferPickReturnFormValues) => {
        const done = await run(
          () =>
            returnMutation.mutateAsync({
              transferId,
              shipmentId,
              request: {
                commandId: commandIds.current.return,
                pickDetailId: values.pickDetailId,
                quantity: values.quantity,
                scannedSlotCode: values.scannedSlotCode,
              },
            }),
          'Đã trả hàng về vị trí.',
          'Không thể trả hàng về vị trí.'
        )
        if (done) setReturnLine(null)
      },
    },
    complete: {
      isOpen: isCompleteOpen,
      isPending: completeMutation.isPending,
      open: () => setIsCompleteOpen(true),
      onOpenChange: setIsCompleteOpen,
      confirm: async () => {
        if (!sheet?.version) return
        const done = await run(
          () =>
            completeMutation.mutateAsync({
              transferId,
              shipmentId,
              request: { expectedVersion: sheet.version ?? '' },
            }),
          'Đã báo lấy xong; chờ quản lý xác nhận xe rời kho.',
          'Không thể hoàn tất lấy hàng.'
        )
        if (done) setIsCompleteOpen(false)
      },
    },
  }
}
