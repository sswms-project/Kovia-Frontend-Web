'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import type { AssignWarehouseTaskTarget } from '../components/TaskAssignment'
import {
  assignWarehouseTaskSchema,
  type AssignWarehouseTaskFormValues,
} from '../schemas/inbound.schema'
import {
  useAssignableStaffQuery,
  useAssignPutawayTaskMutation,
  useAssignReceivingTaskMutation,
  useUnassignReceivingTaskMutation,
} from './use-inbound'

const TASK_LABELS = {
  Receiving: 'nhận hàng',
  PutAway: 'cất hàng',
} as const

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/**
 * Điều phối việc giao/giao lại nhiệm vụ kho: sở hữu form, truy vấn danh sách nhân viên có thể
 * giao và các mutation liên quan. Dialog chỉ nhận `form` và dữ liệu qua props (không tự gọi
 * useForm hay React Query) theo đúng .rules của FE.
 */
export function useAssignWarehouseTask() {
  const [target, setTarget] = useState<
    (AssignWarehouseTaskTarget & { kind: 'Receiving' | 'PutAway' }) | null
  >(null)
  const form = useForm<AssignWarehouseTaskFormValues>({
    resolver: zodResolver(assignWarehouseTaskSchema),
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
  })
  const staffQuery = useAssignableStaffQuery(target?.warehouseId ?? null)
  const assignReceivingMutation = useAssignReceivingTaskMutation()
  const assignPutawayMutation = useAssignPutawayTaskMutation()
  const unassignReceivingMutation = useUnassignReceivingTaskMutation()
  const isPending =
    assignReceivingMutation.isPending ||
    assignPutawayMutation.isPending ||
    unassignReceivingMutation.isPending

  function open(nextTarget: AssignWarehouseTaskTarget & { kind: 'Receiving' | 'PutAway' }) {
    form.reset({
      staffId: '',
      priority: nextTarget.currentPriority,
      dueAt: toDateTimeLocal(nextTarget.currentDueAt),
      reason: '',
    })
    setTarget(nextTarget)
  }

  function close() {
    if (isPending) return
    setTarget(null)
  }

  async function handleSubmit(values: AssignWarehouseTaskFormValues) {
    if (!target) return
    const isReassignment = Boolean(target.currentAssigneeId)

    if (isReassignment && values.staffId === target.currentAssigneeId) {
      form.setError('staffId', {
        message: 'Nhân viên này đang được giao việc. Hãy chọn người khác để giao lại.',
      })
      return
    }
    if (isReassignment && !values.reason.trim()) {
      form.setError('reason', { message: 'Vui lòng nhập lý do giao lại công việc.' })
      return
    }

    const request = {
      staffId: values.staffId,
      expectedStaffId: target.currentAssigneeId,
      reason: values.reason.trim() || null,
      priority: values.priority,
      dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
    }
    const taskLabel = TASK_LABELS[target.kind]

    try {
      if (target.kind === 'Receiving') {
        await assignReceivingMutation.mutateAsync({ inboundRequestId: target.id, request })
      } else {
        await assignPutawayMutation.mutateAsync({ receiptId: target.id, request })
      }
      toast.success(
        isReassignment
          ? `Đã giao lại việc ${taskLabel} ${target.referenceCode}.`
          : `Đã giao việc ${taskLabel} ${target.referenceCode}.`
      )
      setTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Không thể giao việc ${taskLabel}. Vui lòng thử lại.`))
    }
  }

  async function handleUnassign(values: AssignWarehouseTaskFormValues) {
    if (!target || target.kind !== 'Receiving' || !target.currentAssigneeId) return
    const reason = values.reason.trim()
    if (!reason) {
      form.setError('reason', { message: 'Vui lòng nhập lý do hủy giao công việc.' })
      return
    }
    try {
      await unassignReceivingMutation.mutateAsync({
        inboundRequestId: target.id,
        request: { expectedStaffId: target.currentAssigneeId, reason },
      })
      toast.success(`Đã hủy giao việc nhận hàng ${target.referenceCode}.`)
      setTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể hủy giao việc nhận hàng. Vui lòng thử lại.'))
    }
  }

  return {
    target,
    open,
    close,
    form,
    isPending,
    staff: staffQuery.data ?? [],
    isLoadingStaff: staffQuery.isLoading,
    isErrorStaff: staffQuery.isError,
    isFetchingStaff: staffQuery.isFetching,
    onRetryStaff: () => void staffQuery.refetch(),
    onSubmit: () => void form.handleSubmit(handleSubmit)(),
    onUnassign: () => void handleUnassign(form.getValues()),
  }
}
