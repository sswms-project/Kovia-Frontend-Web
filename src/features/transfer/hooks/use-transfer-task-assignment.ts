'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import type { AssignWarehouseTaskFormValues } from '@/features/inbound/schemas/inbound.schema'
import type { AssignWarehouseTaskTarget } from '@/features/inbound/components/TaskAssignment'
import { warehouseTaskService } from '@/features/warehouse-task/services/warehouse-task.service'
import type { AssignWarehouseTaskRequest } from '@/features/warehouse-task/types/warehouse-task.types'
import type { TransferDetail, TransferShipment } from '../types/transfer.types'
import type { TransferTaskKind, TransferTaskType } from '../types/transfer-receipt.types'
import { transferService } from '../services/transfer.service'
import {
  createTransferAssignmentSchema,
  toTransferLocalDate,
} from '../schemas/transfer-assignment.schema'
import { describeTransferError, logTransferError } from '../utils/transfer-errors'
import { useTransferAssignableStaffQuery } from './use-transfer-receipt'
import {
  invalidateTransferQueries,
  refreshTransferAfterWrite,
  TRANSFER_MUTATION_KEY,
} from './use-transfers'

const TASK_TYPES = {
  pick: 'TransferPick',
  receive: 'TransferReceive',
  putaway: 'TransferPutAway',
} as const
export function transferAssignmentTask(shipment: TransferShipment, kind: TransferTaskKind) {
  if (kind === 'pick')
    return {
      id: shipment.pickTaskId,
      version: shipment.pickTaskVersion,
      assignee: shipment.pickAssigneeId,
      name: shipment.pickAssigneeName,
      priority: shipment.pickTaskPriority ?? 'Normal',
      due: shipment.pickTaskDueAt ?? null,
    }
  if (kind === 'receive')
    return {
      id: shipment.receiveTaskId,
      version: shipment.receiveTaskVersion,
      assignee: shipment.receiveAssigneeId,
      name: shipment.receiveAssigneeName,
      priority: shipment.receiveTaskPriority ?? 'Normal',
      due: shipment.receiveTaskDueAt ?? null,
    }
  return {
    id: shipment.putAwayTaskId,
    version: shipment.putAwayTaskVersion,
    assignee: shipment.putAwayAssigneeId ?? null,
    name: shipment.putAwayAssigneeName,
    priority: shipment.putAwayTaskPriority ?? 'Normal',
    due: shipment.putAwayTaskDueAt ?? null,
  }
}

export function useTransferTaskAssignment(transfer: TransferDetail | undefined) {
  const [selected, setSelected] = useState<{ shipmentId: string; kind: TransferTaskKind } | null>(
    null
  )
  const [alsoPutAway, setAlsoPutAway] = useState(false)
  const [results, setResults] = useState<Partial<Record<TransferTaskKind, string>>>({})
  const [needsVerify, setNeedsVerify] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [working, setWorking] = useState(false)
  const lock = useRef(false)
  const attempt = useRef<{
    values: AssignWarehouseTaskFormValues
    kinds: TransferTaskKind[]
    done: Set<TransferTaskKind>
    uncertain: TransferTaskKind | null
    versions: Partial<Record<TransferTaskKind, string | null | undefined>>
    requestedDue: Partial<Record<TransferTaskKind, string | null>>
  } | null>(null)
  const shipment = transfer?.shipments?.find((row) => row.id === selected?.shipmentId)
  const task = shipment && selected ? transferAssignmentTask(shipment, selected.kind) : null
  const canChooseDestinationScope =
    selected?.kind !== 'pick' &&
    Boolean(shipment?.receiveTaskId && shipment?.putAwayTaskId) &&
    (shipment?.status === 'InTransit' || shipment?.status === 'Receiving') &&
    shipment.receiveTaskStatus !== 'Completed' &&
    shipment.receiveTaskStatus !== 'Cancelled' &&
    shipment.putAwayTaskStatus !== 'Completed' &&
    shipment.putAwayTaskStatus !== 'Cancelled'
  const form = useForm<AssignWarehouseTaskFormValues>({
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
    resolver: (values, context, options) =>
      zodResolver(createTransferAssignmentSchema(task?.assignee ?? null, task?.due ?? null))(
        values,
        context,
        options
      ),
  })
  const warehouseId = selected
    ? selected.kind === 'pick'
      ? transfer?.sourceWarehouseId
      : transfer?.destinationWarehouseId
    : null
  const staff = useTransferAssignableStaffQuery(
    warehouseId ?? null,
    TASK_TYPES[selected?.kind ?? 'pick'] as TransferTaskType
  )
  const putStaff = useTransferAssignableStaffQuery(
    alsoPutAway && shipment?.putAwayTaskId ? (warehouseId ?? null) : null,
    'TransferPutAway'
  )
  const client = useQueryClient()
  const mutation = useMutation({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    mutationFn: ({ id, request }: { id: string; request: AssignWarehouseTaskRequest }) =>
      warehouseTaskService.assign(id, request),
    onError: logTransferError,
  })
  const target: AssignWarehouseTaskTarget | null =
    transfer && selected && task?.id
      ? {
          kind: TASK_TYPES[selected.kind],
          id: task.id,
          referenceCode: `${transfer.transferCode} · Đợt ${shipment?.shipmentNumber}`,
          warehouseId: warehouseId ?? '',
          warehouseName:
            selected.kind === 'pick'
              ? transfer.sourceWarehouseName
              : transfer.destinationWarehouseName,
          currentAssigneeId: task.assignee ?? null,
          currentAssigneeName: task.name ?? null,
          currentPriority: task.priority,
          currentDueAt: task.due,
        }
      : null
  async function verify() {
    if (!transfer || !selected || lock.current) return
    lock.current = true
    setVerifying(true)
    try {
      const fresh = (await transferService.getTransfer(transfer.id)).data
      const current = fresh.shipments?.find((row) => row.id === selected.shipmentId)
      const pending = attempt.current
      if (current && pending?.uncertain) {
        const resolved = transferAssignmentTask(current, pending.uncertain)
        const due = pending.requestedDue[pending.uncertain]
          ? Date.parse(pending.requestedDue[pending.uncertain]!)
          : null
        if (
          resolved.assignee === pending.values.staffId &&
          resolved.priority === pending.values.priority &&
          (resolved.due ? Date.parse(resolved.due) : null) === due
        ) {
          const kind = pending.uncertain
          pending.done.add(kind)
          setResults((old) => ({
            ...old,
            [kind]: 'Đã xác minh giao việc thành công.',
          }))
        }
        pending.uncertain = null
      }
      if (current && pending)
        for (const kind of pending.kinds)
          pending.versions[kind] = transferAssignmentTask(current, kind).version
      await invalidateTransferQueries(client, 'none')
      client.setQueryData(queryKeys.transfers.detail(transfer.id), fresh)
      setNeedsVerify(false)
    } catch (error) {
      toast.error(describeTransferError(error, 'Không tải được phiên bản công việc mới.').message)
    } finally {
      lock.current = false
      setVerifying(false)
    }
  }
  async function submit(values: AssignWarehouseTaskFormValues) {
    if (
      !transfer ||
      !selected ||
      !warehouseId ||
      lock.current ||
      needsVerify ||
      staff.isError ||
      putStaff.isError
    )
      return
    const eligible = (staff.data ?? []).filter(
      (person) => !alsoPutAway || (putStaff.data ?? []).some((other) => other.id === person.id)
    )
    if (!attempt.current && !eligible.some((person) => person.id === values.staffId)) {
      form.setError('staffId', {
        message: 'Nhân viên không đủ quyền nhận những công việc đã chọn.',
      })
      return
    }
    lock.current = true
    setWorking(true)
    const pending = attempt.current ?? {
      values: { ...values },
      kinds:
        selected.kind === 'receive' && alsoPutAway
          ? (['receive', 'putaway'] as TransferTaskKind[])
          : [selected.kind],
      done: new Set<TransferTaskKind>(),
      uncertain: null,
      versions: shipment
        ? {
            pick: shipment.pickTaskVersion,
            receive: shipment.receiveTaskVersion,
            putaway: shipment.putAwayTaskVersion,
          }
        : {},
      requestedDue: {},
    }
    attempt.current = pending
    try {
      const current = (
        await transferService.getAssignmentSnapshot(transfer.id, selected.shipmentId, warehouseId)
      ).data
      for (const kind of pending.kinds) {
        if (pending.done.has(kind)) continue
        // The two tasks have independent row versions. The API checks each expected
        // version/assignee atomically, including changes made after this snapshot.
        const next = current.find((task) => task.taskType === TASK_TYPES[kind])
        if (!next?.id || !next.version) throw new Error('Công việc chưa có phiên bản để giao.')
        if (next.version !== pending.versions[kind]) {
          setResults((old) => ({
            ...old,
            [kind]: 'Công việc đã thay đổi. Tải lại để xem người nhận và lịch mới trước khi giao.',
          }))
          setNeedsVerify(true)
          break
        }
        if (
          next.assignee &&
          next.assignee !== pending.values.staffId &&
          !pending.values.reason.trim()
        ) {
          form.setError('reason', { message: 'Nhập lý do đổi người nhận công việc còn lại.' })
          setResults((old) => ({ ...old, [kind]: 'Chưa giao: cần lý do đổi người.' }))
          break
        }
        const requestedDue =
          pending.values.dueAt === toTransferLocalDate(next.due)
            ? next.due
            : pending.values.dueAt
              ? new Date(pending.values.dueAt).toISOString()
              : null
        pending.requestedDue[kind] = requestedDue
        try {
          await mutation.mutateAsync({
            id: next.id,
            request: {
              staffId: pending.values.staffId,
              expectedStaffId: next.assignee ?? null,
              expectedVersion: next.version,
              reason: pending.values.reason.trim() || null,
              priority: pending.values.priority,
              dueAt: requestedDue,
              clearDueAt: !requestedDue,
            },
          })
          pending.done.add(kind)
          setResults((old) => ({ ...old, [kind]: 'Đã giao thành công.' }))
        } catch (error) {
          const result = describeTransferError(error, 'Không thể giao việc.')
          setResults((old) => ({ ...old, [kind]: result.message }))
          if (result.kind !== 'rejected') {
            setNeedsVerify(true)
            if (result.kind === 'unknown-result') pending.uncertain = kind
          }
          break
        }
      }
      if (pending.kinds.every((kind) => pending.done.has(kind))) {
        toast.success('Đã giao đầy đủ công việc đã chọn.')
        setSelected(null)
        attempt.current = null
      }
    } catch (error) {
      toast.error(describeTransferError(error, 'Không tải được công việc để giao.').message)
    } finally {
      if (pending.done.size > 0) await refreshTransferAfterWrite(client, transfer.id)
      lock.current = false
      setWorking(false)
    }
  }
  function open(next: TransferShipment, kind: TransferTaskKind, assignBoth?: boolean) {
    if (lock.current) return
    const entry = transferAssignmentTask(next, kind)
    form.reset({
      staffId: entry.assignee ?? '',
      priority: entry.priority,
      dueAt: toTransferLocalDate(entry.due),
      reason: '',
    })
    attempt.current = null
    setResults({})
    setNeedsVerify(false)
    setAlsoPutAway(
      assignBoth ??
        (kind === 'receive' &&
          Boolean(next.putAwayTaskId) &&
          next.putAwayTaskStatus !== 'Completed' &&
          next.putAwayTaskStatus !== 'Cancelled')
    )
    setSelected({ shipmentId: next.id, kind })
  }
  return {
    target,
    form,
    results,
    alsoPutAway,
    canChooseDestinationScope,
    destinationAssignmentScope: alsoPutAway ? 'both' : selected?.kind,
    destinationAssignees: {
      receive:
        shipment?.receiveAssigneeName ?? (shipment?.receiveAssigneeId ? 'Nhân viên' : 'Chưa giao'),
      putaway:
        shipment?.putAwayAssigneeName ?? (shipment?.putAwayAssigneeId ? 'Nhân viên' : 'Chưa giao'),
    },
    selectDestinationScope: (scope: 'both' | 'receive' | 'putaway') => {
      if (!canChooseDestinationScope || !shipment || attempt.current) return
      open(shipment, scope === 'putaway' ? 'putaway' : 'receive', scope === 'both')
    },
    needsVerify,
    verify,
    isPending: working || mutation.isPending || verifying,
    isLoadingStaff: staff.isLoading || (alsoPutAway && putStaff.isLoading),
    isErrorStaff: staff.isError || (alsoPutAway && putStaff.isError),
    isFetchingStaff: staff.isFetching || putStaff.isFetching,
    staff: (staff.data ?? []).filter(
      (person) => !alsoPutAway || (putStaff.data ?? []).some((other) => other.id === person.id)
    ),
    onRetryStaff: () => {
      void staff.refetch()
      if (alsoPutAway) void putStaff.refetch()
    },
    open,
    onOpenChange: (open: boolean) => {
      if (!open && !lock.current) {
        setSelected(null)
        attempt.current = null
      }
    },
    onSubmit: () => {
      if (attempt.current) {
        attempt.current.values.reason = form.getValues('reason').trim()
        void submit(attempt.current.values)
      } else void form.handleSubmit(submit)()
    },
  }
}
