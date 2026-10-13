'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef, useState } from 'react'
import type { ResolveTransferDiscrepancyRequest } from '../types/transfer.types'
import { newCommandId } from '../utils/transfer-command-id'
import { describeTransferError } from '../utils/transfer-errors'
import { useForm } from 'react-hook-form'
import {
  transferReasonSchema,
  type TransferReasonFormValues,
} from '../schemas/transfer-actions.schema'
import type { PendingEscalation } from '../components/TransferDetailPage/ResolveEscalationDialog'
import {
  transferDiscrepancySchema,
  transferEscalationResolutionSchema,
  type TransferDiscrepancyFormValues,
  type TransferEscalationResolutionFormValues,
} from '../schemas/transfer-fulfillment.schema'
import type { TransferDetail, TransferDiscrepancy, TransferShipment } from '../types/transfer.types'
import { useTransferActionRunner } from './use-transfer-action-runner'
import {
  useDispatchTransferShipmentMutation,
  useFindReceivableSlotMutation,
  useReopenTransferPickingMutation,
  useResolveTransferDiscrepancyMutation,
  useResolveTransferEscalationMutation,
  useTransferPickAlternativesQuery,
  useTransferPickSheetQuery,
  useTransferReceiveSheetQuery,
} from './use-transfer-fulfillment'
import { useTransferTaskAssignment } from './use-transfer-task-assignment'

const EMPTY_ESCALATION: TransferEscalationResolutionFormValues = {
  action: 'UseStock',
  toInventoryStockId: '',
  quantity: 1,
  note: '',
}

const EMPTY_DISCREPANCY: TransferDiscrepancyFormValues = {
  action: 'LateReceipt',
  quantity: 1,
  lotId: '',
  destinationSlotId: '',
  scannedSlotCode: '',
  note: '',
}

/**
 * Giao việc lấy/nhận, xử lý báo cáo lấy hàng và xử lý chênh lệch: các thao tác của quản lý kho cần thêm dữ liệu
 * phụ (nhân viên, phiếu lấy hàng, lô đã xuất) nên gom ở một chỗ, hộp thoại chỉ nhận props.
 */
export function useTransferResolutionActions(transfer: TransferDetail | undefined) {
  const run = useTransferActionRunner()
  const transferId = transfer?.id ?? null

  const assign = useTransferTaskAssignment(transfer)

  const [departureShipment, setDepartureShipment] = useState<TransferShipment | null>(null)
  const departureMutation = useDispatchTransferShipmentMutation()
  const [reopenShipment, setReopenShipment] = useState<TransferShipment | null>(null)
  const reopenForm = useForm<TransferReasonFormValues>({
    resolver: zodResolver(transferReasonSchema),
    defaultValues: { reason: '' },
  })
  const reopenMutation = useReopenTransferPickingMutation()

  const [escalationShipment, setEscalationShipment] = useState<TransferShipment | null>(null)
  const [selectedExceptionId, setSelectedExceptionId] = useState('')
  const escalationForm = useForm<TransferEscalationResolutionFormValues>({
    resolver: zodResolver(transferEscalationResolutionSchema),
    defaultValues: EMPTY_ESCALATION,
  })
  const pickSheetQuery = useTransferPickSheetQuery(transferId, escalationShipment?.id ?? null)
  const escalations = useMemo<PendingEscalation[]>(
    () =>
      (pickSheetQuery.data?.lines ?? []).flatMap((line) =>
        line.exceptions
          .filter((exception) => exception.status === 'PendingManager')
          .map((exception) => ({ line, exception }))
      ),
    [pickSheetQuery.data?.lines]
  )
  const selectedEscalation = escalations.find((entry) => entry.exception.id === selectedExceptionId)
  const alternativesQuery = useTransferPickAlternativesQuery(
    transferId,
    escalationShipment?.id ?? null,
    selectedEscalation?.line.lineId ?? null
  )
  const resolveEscalationMutation = useResolveTransferEscalationMutation()

  const [discrepancy, setDiscrepancy] = useState<TransferDiscrepancy | null>(null)
  const discrepancyLock = useRef(false)
  const discrepancyIntent = useRef<ResolveTransferDiscrepancyRequest | null>(null)
  const [discrepancyUnknown, setDiscrepancyUnknown] = useState(false)
  const [discrepancyBusy, setDiscrepancyBusy] = useState(false)
  const discrepancyForm = useForm<TransferDiscrepancyFormValues>({
    resolver: zodResolver(transferDiscrepancySchema),
    defaultValues: EMPTY_DISCREPANCY,
  })
  const receiveSheetQuery = useTransferReceiveSheetQuery(
    transferId,
    discrepancy?.shipmentId ?? null
  )
  const resolveDiscrepancyMutation = useResolveTransferDiscrepancyMutation()
  const findSlotMutation = useFindReceivableSlotMutation()

  const lotOptions = useMemo(
    () =>
      (receiveSheetQuery.data?.lines ?? [])
        .filter((line) => line.itemId === discrepancy?.itemId)
        .flatMap((line) => line.lots)
        .filter((lot) => lot.lotId)
        .map((lot) => ({
          id: lot.lotId ?? '',
          label: `Lô ${lot.lotNumber ?? '—'}`,
        })),
    [discrepancy?.itemId, receiveSheetQuery.data?.lines]
  )

  return {
    assign,
    departure: {
      shipment: departureShipment,
      isPending: departureMutation.isPending,
      open: (shipment: TransferShipment) => setDepartureShipment(shipment),
      onOpenChange: (open: boolean) => !open && setDepartureShipment(null),
      confirm: async () => {
        if (!transferId || !departureShipment?.version) return
        const done = await run(
          () =>
            departureMutation.mutateAsync({
              transferId,
              shipmentId: departureShipment.id,
              request: { expectedVersion: departureShipment.version ?? '' },
            }),
          'Đã xác nhận xuất kho; kho nhập sẽ nhận hàng.',
          'Không thể xác nhận xuất kho.'
        )
        if (done) setDepartureShipment(null)
      },
    },
    reopen: {
      shipment: reopenShipment,
      form: reopenForm,
      isPending: reopenMutation.isPending,
      open: (shipment: TransferShipment) => {
        reopenForm.reset({ reason: '' })
        setReopenShipment(shipment)
      },
      onOpenChange: (open: boolean) => !open && setReopenShipment(null),
      submit: async (values: TransferReasonFormValues) => {
        if (!transferId || !reopenShipment?.version) return
        const done = await run(
          () =>
            reopenMutation.mutateAsync({
              transferId,
              shipmentId: reopenShipment.id,
              request: { expectedVersion: reopenShipment.version ?? '', reason: values.reason },
            }),
          'Đã mở lại lấy hàng cho đợt.',
          'Không thể mở lại lấy hàng.'
        )
        if (done) setReopenShipment(null)
      },
    },
    escalation: {
      isOpen: Boolean(escalationShipment),
      escalations,
      selectedExceptionId,
      alternatives: alternativesQuery.data ?? [],
      isLoading: pickSheetQuery.isLoading,
      form: escalationForm,
      isPending: resolveEscalationMutation.isPending,
      open: (shipment: TransferShipment) => {
        escalationForm.reset(EMPTY_ESCALATION)
        setSelectedExceptionId('')
        setEscalationShipment(shipment)
      },
      select: (entry: PendingEscalation) => {
        setSelectedExceptionId(entry.exception.id)
        escalationForm.reset({ ...EMPTY_ESCALATION, quantity: entry.exception.quantity })
      },
      onOpenChange: (open: boolean) => !open && setEscalationShipment(null),
      submit: async (values: TransferEscalationResolutionFormValues) => {
        if (!transferId || !escalationShipment || !selectedEscalation) return
        const done = await run(
          () =>
            resolveEscalationMutation.mutateAsync({
              transferId,
              shipmentId: escalationShipment.id,
              lineId: selectedEscalation.line.lineId,
              exceptionId: selectedEscalation.exception.id,
              request: {
                action: values.action,
                fromInventoryStockId: null,
                toInventoryStockId: values.toInventoryStockId || null,
                quantity: values.quantity,
                note: values.note || null,
              },
            }),
          'Đã xử lý báo cáo lấy hàng.',
          'Không thể xử lý báo cáo lấy hàng.'
        )
        if (!done) return
        setSelectedExceptionId('')
        if (escalations.length <= 1) setEscalationShipment(null)
      },
    },
    discrepancy: {
      unknownResult: discrepancyUnknown,
      target: discrepancy,
      form: discrepancyForm,
      lotOptions,
      isPending:
        discrepancyBusy || resolveDiscrepancyMutation.isPending || findSlotMutation.isPending,
      open: (entry: TransferDiscrepancy) => {
        if (discrepancyLock.current || discrepancyUnknown) return
        discrepancyIntent.current = null
        discrepancyForm.reset({
          ...EMPTY_DISCREPANCY,
          action: entry.type === 'Missing' ? 'LateReceipt' : 'AcknowledgeDamage',
          quantity: Math.max(0, entry.quantity - entry.resolvedQuantity),
        })
        setDiscrepancy(entry)
      },
      onOpenChange: (open: boolean) => {
        if (!open && !discrepancyLock.current && !discrepancyUnknown) setDiscrepancy(null)
      },
      submit: async (values: TransferDiscrepancyFormValues) => {
        if (!transfer || !discrepancy || discrepancyLock.current) return
        discrepancyLock.current = true
        setDiscrepancyBusy(true)
        try {
          let destinationSlotId: string | null = null
          if (values.action === 'LateReceipt' && !discrepancyIntent.current) {
            try {
              const slot = await findSlotMutation.mutateAsync({
                warehouseId: transfer.destinationWarehouseId,
                scannedCode: values.scannedSlotCode,
              })
              if (!slot) {
                discrepancyForm.setError('scannedSlotCode', {
                  message: 'Mã vị trí không khớp vị trí đang hoạt động nào của kho nhập.',
                })
                return
              }
              destinationSlotId = slot.id
            } catch {
              discrepancyForm.setError('scannedSlotCode', {
                message: 'Không tra được vị trí. Hãy kiểm tra kết nối rồi thử lại.',
              })
              return
            }
          }
          const request = discrepancyIntent.current ?? {
            commandId: newCommandId(),
            action: values.action,
            quantity: values.quantity,
            lotId: values.lotId || null,
            destinationSlotId,
            scannedSlotCode: values.scannedSlotCode || null,
            note: values.note || null,
          }
          discrepancyIntent.current = request
          const done = await run(
            async () => {
              try {
                return await resolveDiscrepancyMutation.mutateAsync({
                  transferId: transfer.id,
                  discrepancyId: discrepancy.id,
                  request,
                })
              } catch (error) {
                if (describeTransferError(error, '').kind === 'unknown-result')
                  setDiscrepancyUnknown(true)
                else {
                  discrepancyIntent.current = null
                  setDiscrepancyUnknown(false)
                }
                throw error
              }
            },
            'Đã xử lý chênh lệch.',
            'Không thể xử lý chênh lệch.'
          )
          if (done) {
            discrepancyIntent.current = null
            setDiscrepancyUnknown(false)
            setDiscrepancy(null)
          }
        } finally {
          discrepancyLock.current = false
          setDiscrepancyBusy(false)
        }
      },
    },
  }
}
