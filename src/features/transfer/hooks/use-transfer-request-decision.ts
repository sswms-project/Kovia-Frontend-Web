'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  transferReasonSchema,
  type TransferReasonFormValues,
} from '../schemas/transfer-actions.schema'
import {
  transferRequestDecisionSchema,
  withdrawTransferRequestSchema,
} from '../schemas/transfer-decision.schema'
import { transferService } from '../services/transfer.service'
import type {
  TransferDetail,
  TransferRequestDecision,
  WithdrawTransferRequest,
} from '../types/transfer.types'
import { newCommandId } from '../utils/transfer-command-id'
import { describeTransferError, logTransferError } from '../utils/transfer-errors'
import { TRANSFER_MUTATION_KEY, invalidateTransferQueries } from './use-transfers'

export type TransferDecisionKind = 'accept' | 'reject' | 'withdraw'

interface DecisionIntent {
  kind: TransferDecisionKind
  transferId: string
  request: TransferRequestDecision | WithdrawTransferRequest
}

/** A decision is tied to the version shown when its dialog opened, not a later realtime refresh. */
export function useTransferRequestDecision(transfer: TransferDetail | undefined) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [kind, setKind] = useState<TransferDecisionKind | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [checking, setChecking] = useState(false)
  const [processing, setProcessing] = useState(false)
  const intent = useRef<DecisionIntent | null>(null)
  const snapshot = useRef({ transferId: '', version: '' })
  const uncertainRef = useRef(false)
  const lock = useRef(false)
  const form = useForm<TransferReasonFormValues>({
    resolver: zodResolver(transferReasonSchema),
    defaultValues: { reason: '' },
  })
  const mutation = useMutation({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    mutationFn: (value: DecisionIntent) =>
      value.kind === 'withdraw'
        ? transferService.withdrawRequest(
            value.transferId,
            withdrawTransferRequestSchema.parse(value.request)
          )
        : transferService.decideRequest(
            value.transferId,
            transferRequestDecisionSchema.parse(value.request)
          ),
    onError: logTransferError,
  })

  function open(next: TransferDecisionKind) {
    if (lock.current || uncertainRef.current || !transfer?.version) return
    snapshot.current = { transferId: transfer.id, version: transfer.version }
    form.reset({ reason: '' })
    setKind(next)
  }

  async function submit(reason: string | null = null) {
    if (!kind || !transfer || lock.current || uncertainRef.current) return
    if (snapshot.current.transferId !== transfer.id) {
      setKind(null)
      toast.error('Phiếu đang xem đã thay đổi. Vui lòng mở lại thao tác.')
      return
    }
    const request = { expectedVersion: snapshot.current.version, commandId: newCommandId() }
    const value: DecisionIntent = {
      kind,
      transferId: snapshot.current.transferId,
      request: kind === 'withdraw' ? request : { ...request, accept: kind === 'accept', reason },
    }
    const validation =
      kind === 'withdraw'
        ? withdrawTransferRequestSchema.safeParse(value.request)
        : transferRequestDecisionSchema.safeParse(value.request)
    if (!validation.success) {
      const issue = validation.error.issues[0]
      if (issue?.path[0] === 'reason') form.setError('reason', { message: issue.message })
      else toast.error(issue?.message || 'Thông tin xác nhận không hợp lệ. Vui lòng tải lại.')
      return
    }
    intent.current = value
    lock.current = true
    setProcessing(true)
    try {
      await mutation.mutateAsync(value)
      setKind(null)
      toast.success(
        kind === 'withdraw'
          ? 'Đã thu hồi yêu cầu về nháp.'
          : kind === 'accept'
            ? 'Kho xuất đã chấp nhận và giữ chỗ hàng hóa.'
            : 'Đã từ chối và thông báo cho người tạo.'
      )
      await invalidateTransferQueries(queryClient)
      if (kind === 'withdraw') router.push(APP_ROUTES.transferEdit(value.transferId))
      intent.current = null
    } catch (error) {
      const description = describeTransferError(error, 'Không thể xử lý yêu cầu điều chuyển.')
      uncertainRef.current = description.kind === 'unknown-result'
      setUncertain(uncertainRef.current)
      toast.error(description.message)
      if (description.kind === 'conflict') {
        setKind(null)
        intent.current = null
        await invalidateTransferQueries(queryClient)
      }
    } finally {
      lock.current = false
      setProcessing(false)
    }
  }

  async function verify() {
    if (lock.current || !intent.current) return
    if (intent.current.transferId !== transfer?.id) {
      intent.current = null
      uncertainRef.current = false
      setUncertain(false)
      setKind(null)
      toast.info(
        'Bạn đã chuyển phiếu. Hãy mở lại phiếu trước để đối chiếu thao tác chưa rõ kết quả.'
      )
      return
    }
    lock.current = true
    setChecking(true)
    try {
      const response = await transferService.getTransfer(intent.current.transferId)
      if (response.data.status === 'PendingSourceAcceptance') {
        toast.info(
          'Yêu cầu vẫn đang chờ. Chưa đủ cơ sở xác định lệnh trước thất bại; không gửi lại tự động.'
        )
        return
      }
      await invalidateTransferQueries(queryClient)
      setKind(null)
      uncertainRef.current = false
      setUncertain(false)
      if (response.data.status === 'Draft') router.push(APP_ROUTES.transferEdit(response.data.id))
      toast.info(
        'Đã tải trạng thái hiện tại để đối chiếu. Xem lịch sử để biết quyết định đã được ghi nhận.'
      )
      intent.current = null
    } catch (error) {
      logTransferError(error)
      toast.error('Chưa thể đối chiếu kết quả. Không gửi lại thao tác.')
    } finally {
      setChecking(false)
      lock.current = false
    }
  }

  return {
    kind,
    form,
    uncertain,
    isPending: mutation.isPending || checking || processing,
    open,
    submit,
    verify,
    close: () => {
      if (!lock.current && !uncertainRef.current) setKind(null)
    },
  }
}
