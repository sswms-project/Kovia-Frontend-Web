'use client'

import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferFormMode } from '../components/TransferFormPage'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import type { TransferDetail } from '../types/transfer.types'
import { describeTransferError } from '../utils/transfer-errors'
import {
  toSaveDraftRequest,
  toUpdateTransferRequest,
  transferToFormValues,
} from '../utils/transfer-form'
import {
  useSaveTransferDraftMutation,
  useSubmitTransferDraftMutation,
  useUpdateTransferMutation,
} from './use-transfers'

interface UseTransferFormActionsOptions {
  readonly mode: TransferFormMode
  readonly transferId?: string
  readonly detail: TransferDetail | undefined
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly refetchDetail: () => Promise<{ data?: TransferDetail }>
  /** Gọi khi người dùng chấp nhận dữ liệu mới của server (tải lại) hoặc bỏ qua cảnh báo thay đổi. */
  readonly dismissRealtime: () => void
}

/** Lưu nháp, gửi yêu cầu và sửa phiếu của form điều chuyển; giữ trạng thái xác nhận và xung đột phiên bản. */
export function useTransferFormActions({
  mode,
  transferId,
  detail,
  form,
  refetchDetail,
  dismissRealtime,
}: UseTransferFormActionsOptions) {
  const router = useRouter()
  const hydratedId = useRef<string | null>(null)
  const draftIdRef = useRef<string | null>(null)
  const savedDraftOnceRef = useRef(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)

  const saveDraftMutation = useSaveTransferDraftMutation()
  const submitDraftMutation = useSubmitTransferDraftMutation()
  const updateMutation = useUpdateTransferMutation()
  const isSaving =
    saveDraftMutation.isPending || submitDraftMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!detail || hydratedId.current === detail.id) return
    hydratedId.current = detail.id
    draftIdRef.current = detail.status === 'Draft' ? detail.id : null
    form.reset(transferToFormValues(detail))
  }, [detail, form])

  function reportError(error: unknown, fallback: string) {
    const description = describeTransferError(error, fallback)
    toast.error(description.message)
    if (description.kind === 'conflict') setHasConflict(true)
  }

  async function saveDraft(values: TransferRequestFormValues): Promise<string | null> {
    const expectedVersion =
      mode === 'draft' && !savedDraftOnceRef.current ? (detail?.version ?? null) : null
    const response = await saveDraftMutation.mutateAsync({
      transferId: draftIdRef.current,
      request: toSaveDraftRequest(values, expectedVersion),
    })
    draftIdRef.current = response.data
    savedDraftOnceRef.current = true
    return response.data
  }

  async function reload() {
    const refreshed = await refetchDetail()
    if (refreshed.data) form.reset(transferToFormValues(refreshed.data))
    dismissRealtime()
    setHasConflict(false)
  }

  function dismissChange() {
    dismissRealtime()
    setHasConflict(false)
  }

  async function handleSaveDraft(values: TransferRequestFormValues) {
    try {
      const id = await saveDraft(values)
      form.reset(values)
      toast.success('Đã lưu nháp. Nháp chưa giữ chỗ tồn kho.')
      if (id && !transferId) router.replace(APP_ROUTES.transferEdit(id))
    } catch (error) {
      reportError(error, 'Không thể lưu nháp.')
    }
  }

  async function handleSubmitRequest(values: TransferRequestFormValues) {
    let draftId: string | null = null
    try {
      draftId = await saveDraft(values)
      if (!draftId) return
      await submitDraftMutation.mutateAsync({
        transferId: draftId,
        request: { expectedVersion: null },
      })
      form.reset(values)
      setIsConfirmOpen(false)
      toast.success('Đã tạo yêu cầu điều chuyển và giữ chỗ tồn kho.')
      router.push(APP_ROUTES.transferDetail(draftId))
    } catch (error) {
      setIsConfirmOpen(false)
      const description = describeTransferError(error, 'Không thể tạo yêu cầu điều chuyển.')
      toast.error(
        draftId ? `Đã lưu nháp nhưng chưa gửi được: ${description.message}` : description.message
      )
      if (description.kind === 'conflict') setHasConflict(true)
    }
  }

  async function handleUpdate(values: TransferRequestFormValues) {
    if (!transferId || !detail?.version) return
    try {
      await updateMutation.mutateAsync({
        transferId,
        request: toUpdateTransferRequest(values, detail, detail.version),
      })
      form.reset(values)
      toast.success('Đã cập nhật yêu cầu điều chuyển.')
      router.push(APP_ROUTES.transferDetail(transferId))
    } catch (error) {
      reportError(error, 'Không thể cập nhật yêu cầu điều chuyển.')
    }
  }

  return {
    isSaving,
    isConfirmOpen,
    setIsConfirmOpen,
    hasConflict,
    reload,
    dismissChange,
    saveDraft: handleSaveDraft,
    submitRequest: handleSubmitRequest,
    update: handleUpdate,
  }
}
