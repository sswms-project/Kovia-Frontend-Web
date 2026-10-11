'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  createShipmentSchema,
  transferFeedbackReplySchema,
  transferFeedbackSchema,
  transferReasonSchema,
  type CreateShipmentFormValues,
  type TransferFeedbackFormValues,
  type TransferFeedbackReplyFormValues,
  type TransferReasonFormValues,
} from '../schemas/transfer-actions.schema'
import type { TransferDetail, TransferFeedback, TransferShipment } from '../types/transfer.types'
import type { TransferClosingAction } from '../utils/transfer-capabilities'
import { visibleTransferItems } from '../utils/transfer-form'
import {
  useCancelTransferShipmentMutation,
  useCreateTransferShipmentMutation,
} from './use-transfer-fulfillment'
import { useTransferActionRunner } from './use-transfer-action-runner'
import {
  useAddTransferFeedbackMutation,
  useCancelTransferMutation,
  useReplyTransferFeedbackMutation,
  useStopTransferRemainingMutation,
} from './use-transfers'

const EMPTY_REASON: TransferReasonFormValues = { reason: '' }

/**
 * Thao tác của người tạo và quản lý trên phiếu: hủy/dừng, phản hồi, tạo và hủy đợt. Sở hữu form và mutation để
 * các hộp thoại chỉ nhận props.
 */
export function useTransferRequestActions(transfer: TransferDetail | undefined) {
  const run = useTransferActionRunner()
  const [closingKind, setClosingKind] = useState<Exclude<TransferClosingAction, null> | null>(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<TransferFeedback | null>(null)
  const [isShipmentOpen, setIsShipmentOpen] = useState(false)
  const [cancellingShipment, setCancellingShipment] = useState<TransferShipment | null>(null)

  const closeForm = useForm<TransferReasonFormValues>({
    resolver: zodResolver(transferReasonSchema),
    defaultValues: EMPTY_REASON,
  })
  const shipmentCancelForm = useForm<TransferReasonFormValues>({
    resolver: zodResolver(transferReasonSchema),
    defaultValues: EMPTY_REASON,
  })
  const feedbackForm = useForm<TransferFeedbackFormValues>({
    resolver: zodResolver(transferFeedbackSchema),
    defaultValues: { reasonCode: 'InsufficientStock', itemId: '', message: '' },
  })
  const replyForm = useForm<TransferFeedbackReplyFormValues>({
    resolver: zodResolver(transferFeedbackReplySchema),
    defaultValues: { reply: '', close: true },
  })
  const shipmentForm = useForm<CreateShipmentFormValues>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: { lines: [] },
  })

  const cancelMutation = useCancelTransferMutation()
  const stopMutation = useStopTransferRemainingMutation()
  const addFeedbackMutation = useAddTransferFeedbackMutation()
  const replyMutation = useReplyTransferFeedbackMutation()
  const createShipmentMutation = useCreateTransferShipmentMutation()
  const cancelShipmentMutation = useCancelTransferShipmentMutation()

  const transferId = transfer?.id ?? ''

  return {
    closing: {
      kind: closingKind,
      form: closeForm,
      isPending: cancelMutation.isPending || stopMutation.isPending,
      open: (kind: Exclude<TransferClosingAction, null>) => {
        closeForm.reset(EMPTY_REASON)
        setClosingKind(kind)
      },
      onOpenChange: (open: boolean) => !open && setClosingKind(null),
      submit: async (values: TransferReasonFormValues) => {
        const request = { reason: values.reason, expectedVersion: transfer?.version ?? null }
        const mutation = closingKind === 'stop' ? stopMutation : cancelMutation
        const done = await run(
          () => mutation.mutateAsync({ transferId, request }),
          closingKind === 'stop'
            ? 'Đã dừng phần còn lại của phiếu điều chuyển.'
            : 'Đã hủy phiếu điều chuyển và nhả giữ chỗ.',
          closingKind === 'stop' ? 'Không thể dừng phần còn lại.' : 'Không thể hủy phiếu.'
        )
        if (done) setClosingKind(null)
      },
    },
    feedback: {
      isOpen: isFeedbackOpen,
      form: feedbackForm,
      isPending: addFeedbackMutation.isPending,
      open: () => {
        feedbackForm.reset({ reasonCode: 'InsufficientStock', itemId: '', message: '' })
        setIsFeedbackOpen(true)
      },
      onOpenChange: setIsFeedbackOpen,
      submit: async (values: TransferFeedbackFormValues) => {
        const done = await run(
          () =>
            addFeedbackMutation.mutateAsync({
              transferId,
              request: {
                reasonCode: values.reasonCode,
                itemId: values.itemId || null,
                message: values.message,
              },
            }),
          'Đã gửi phản hồi cho người tạo phiếu.',
          'Không thể gửi phản hồi.'
        )
        if (done) setIsFeedbackOpen(false)
      },
    },
    reply: {
      target: replyingTo,
      form: replyForm,
      isPending: replyMutation.isPending,
      open: (feedback: TransferFeedback) => {
        replyForm.reset({ reply: '', close: true })
        setReplyingTo(feedback)
      },
      onOpenChange: (open: boolean) => !open && setReplyingTo(null),
      submit: async (values: TransferFeedbackReplyFormValues) => {
        if (!replyingTo) return
        const done = await run(
          () =>
            replyMutation.mutateAsync({
              transferId,
              feedbackId: replyingTo.id,
              request: { reply: values.reply, close: values.close },
            }),
          'Đã trả lời phản hồi.',
          'Không thể trả lời phản hồi.'
        )
        if (done) setReplyingTo(null)
      },
    },
    shipment: {
      isOpen: isShipmentOpen,
      form: shipmentForm,
      isPending: createShipmentMutation.isPending,
      open: () => {
        shipmentForm.reset({
          lines: visibleTransferItems(transfer?.items ?? [])
            .filter((item) => item.unbatchedQuantity > 0)
            .map((item) => ({
              itemId: item.id,
              label: `${item.sku} · ${item.productName}`,
              unitName: item.baseUnitName ?? '',
              selected: true,
              maximum: item.unbatchedQuantity,
              quantity: item.unbatchedQuantity,
            })),
        })
        setIsShipmentOpen(true)
      },
      onOpenChange: setIsShipmentOpen,
      submit: async (values: CreateShipmentFormValues) => {
        const done = await run(
          () =>
            createShipmentMutation.mutateAsync({
              transferId,
              request: {
                lines: values.lines
                  .filter((line) => line.selected)
                  .map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
              },
            }),
          'Đã tạo đợt xuất và công việc lấy hàng.',
          'Không thể tạo đợt xuất.'
        )
        if (done) setIsShipmentOpen(false)
      },
    },
    cancelShipment: {
      target: cancellingShipment,
      form: shipmentCancelForm,
      isPending: cancelShipmentMutation.isPending,
      open: (shipment: TransferShipment) => {
        shipmentCancelForm.reset(EMPTY_REASON)
        setCancellingShipment(shipment)
      },
      onOpenChange: (open: boolean) => !open && setCancellingShipment(null),
      submit: async (values: TransferReasonFormValues) => {
        if (!cancellingShipment) return
        const done = await run(
          () =>
            cancelShipmentMutation.mutateAsync({
              transferId,
              shipmentId: cancellingShipment.id,
              request: { reason: values.reason },
            }),
          'Đã hủy đợt xuất; phần kế hoạch quay về chưa vào đợt.',
          'Không thể hủy đợt xuất.'
        )
        if (done) setCancellingShipment(null)
      },
    },
  }
}
