'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { type AssignWarehouseTaskFormValues } from '@/features/inbound/schemas/inbound.schema'
import { toOperationalDateTimeInput, toOperationalDateTimeApi } from '@/lib/operational-date-time'
import { returnWorkAssignmentSchema } from '../schemas/return-work.schema'
import type { ReturnWork } from '../types/return-work.types'
import { returnWorkService } from '../services/return-work.service'
import { useReturnCommand } from './use-return-command'
import { useReturnWork } from './use-return-work'
import type { AssignReturnWorkRequest, ManageReturnWorkRequest } from '../types/return-work.types'

const reasonSchema = z.object({ reason: z.string().trim().min(1, 'Vui lòng nhập lý do.').max(500) })

export function useReturnWorkPanel(supplier: boolean, documentId: string) {
  const work = useReturnWork(supplier, documentId)
  const assignmentCommand = useReturnCommand<AssignReturnWorkRequest>()
  const actionCommand = useReturnCommand<ManageReturnWorkRequest>()
  const [assignmentTarget, setAssignmentTarget] = useState<ReturnWork | null>(null)
  const assigning = assignmentTarget !== null
  const setAssigning = (open: boolean) => {
    if (!open && !assignmentCommand.isLocked) setAssignmentTarget(null)
  }
  const [reasonTarget, setReasonTarget] = useState<ReturnWork | null>(null)
  const [reasonAction, updateReasonAction] = useState<'Pause' | 'Return' | null>(null)
  function setReasonAction(next: 'Pause' | 'Return' | null) {
    if (actionCommand.isLocked && next === null) return
    setReasonTarget(next ? (work.query.data ?? null) : null)
    updateReasonAction(next)
  }
  const intent = useRef<{ key: string; commandId: string } | null>(null)
  const lock = useRef(false)
  const form = useForm<AssignWarehouseTaskFormValues>({
    resolver: zodResolver(returnWorkAssignmentSchema(assignmentTarget?.dueAt ?? null)),
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
  })
  const reasonForm = useForm<z.infer<typeof reasonSchema>>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })
  const staff = useQuery({
    queryKey: queryKeys.returnWork.staff(supplier, documentId),
    queryFn: () => returnWorkService.staff(supplier, documentId),
    enabled: assigning && work.query.data?.canAssign === true,
  })
  const assignment = useMutation({
    mutationFn: (request: AssignReturnWorkRequest) =>
      returnWorkService.assign(supplier, documentId, request),
    onSuccess: async () => {
      toast.success('Đã lưu phân công.')
      await work.refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể lưu phân công.')),
  })
  const action = useMutation({
    mutationFn: (request: ManageReturnWorkRequest) =>
      returnWorkService.action(supplier, documentId, request),
    onSuccess: async () => {
      toast.success('Đã cập nhật nhiệm vụ.')
      await work.refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể cập nhật nhiệm vụ.')),
  })
  function commandId(payload: unknown) {
    const key = JSON.stringify([supplier, documentId, payload])
    if (intent.current?.key !== key) intent.current = { key, commandId: crypto.randomUUID() }
    return intent.current.commandId
  }
  function openAssignment() {
    const data = work.query.data
    if (!data?.canAssign) return
    form.reset({
      staffId: data.assignedTo ?? '',
      priority: data.priority ?? 'Normal',
      dueAt: toOperationalDateTimeInput(data.dueAt),
      reason: '',
    })
    setAssignmentTarget(data)
  }
  async function submitAssignment(values: AssignWarehouseTaskFormValues) {
    const data = assignmentTarget
    if ((!data?.canAssign && !assignmentCommand.isUncertain) || !data || lock.current) return
    if (data.assignedTo && data.assignedTo !== values.staffId && !values.reason.trim()) {
      form.setError('reason', { message: 'Vui lòng nhập lý do giao lại.' })
      return
    }
    const payload = {
      staffId: values.staffId,
      expectedStaffId: data.assignedTo,
      documentVersion: data.documentVersion,
      taskVersion: data.taskVersion,
      priority: values.priority,
      dueAt: toOperationalDateTimeApi(values.dueAt, data.dueAt),
      reason: values.reason.trim() || null,
    }
    lock.current = true
    try {
      await assignmentCommand.run(
        () => ({ ...payload, commandId: commandId(payload) }),
        (request) => assignment.mutateAsync(request)
      )
      setAssignmentTarget(null)
    } catch {
      /* mutation displays error; preserve intent for retry */
    } finally {
      lock.current = false
    }
  }
  async function manage(next: 'Start' | 'Pause' | 'Return', reason?: string) {
    const data = next === 'Start' ? work.query.data : reasonTarget
    if (!data?.canManage || !data.taskId || !data.taskVersion || lock.current) return
    const payload = {
      taskId: data.taskId,
      documentVersion: data.documentVersion,
      taskVersion: data.taskVersion,
      action: next,
      reason,
    }
    lock.current = true
    try {
      await actionCommand.run(
        () => ({ ...payload, commandId: commandId(payload) }),
        (request) => action.mutateAsync(request)
      )
      updateReasonAction(null)
      setReasonTarget(null)
    } catch {
      /* mutation owns notification */
    } finally {
      lock.current = false
    }
  }
  return {
    assignmentCommand,
    actionCommand,
    retryAssignment: () =>
      assignmentCommand
        .run(
          () => {
            throw new Error('Không có thao tác cần xác minh.')
          },
          (request) => assignment.mutateAsync(request)
        )
        .then(() => setAssignmentTarget(null))
        .catch(() => {}),
    retryAction: () =>
      actionCommand
        .run(
          () => {
            throw new Error('Không có thao tác cần xác minh.')
          },
          (request) => action.mutateAsync(request)
        )
        .then(() => {
          updateReasonAction(null)
          setReasonTarget(null)
        })
        .catch(() => {}),
    work,
    assigning,
    assignmentTarget,
    setAssigning,
    openAssignment,
    form,
    staff,
    assignment,
    action,
    submitAssignment,
    manage,
    reasonAction,
    setReasonAction,
    reasonForm,
  }
}
