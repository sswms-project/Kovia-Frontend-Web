import { useEffect, useState, type BaseSyntheticEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { crossDockService } from '../services/cross-dock.service'
import {
  authorizeCrossDockCommandSchema,
  crossDockAuthorizationSchema,
  type AuthorizeCrossDockCommand,
  type CrossDockAuthorizationValues,
} from '../schemas/cross-dock.schema'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

type Confirmation = { scope: string } & (
  | { action: 'authorize'; body: AuthorizeCrossDockCommand }
  | { action: 'revoke'; demandId: string; expectedVersion: string }
)

async function readCrossDock<T>(load: () => Promise<T>, signal: AbortSignal): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (!signal.aborted) logger.warn('Không thể tải dữ liệu phân bổ thông minh', error)
    throw error
  }
}

export function useCrossDock(order: StockIssueRequestSummary) {
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const canView =
    !me.isError && !!me.data?.tenantId && permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW)
  const canManage = canView && permissions.includes(P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER)
  const canSelfApprove = permissions.includes(P.STOCK_ISSUE_REQUESTS_SELF_APPROVE)
  const awaitingAllocation = order.status === 'Pending'
  const scope = JSON.stringify([
    me.data?.id,
    me.data?.tenantId,
    permissions,
    order.id,
    order.warehouseId,
    order.version,
  ])
  const [range] = useState(() => ({
    to: new Date().toISOString(),
    from: new Date(Date.now() - 30 * 86400000).toISOString(),
  }))
  const [stored, setStored] = useState<Confirmation | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!canView || !awaitingAllocation) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [canView, awaitingAllocation])
  const target = stored?.scope === scope ? stored : null
  const client = useQueryClient()
  const form = useForm<CrossDockAuthorizationValues>({
    resolver: zodResolver(crossDockAuthorizationSchema),
    defaultValues: { assignedStaffId: '', hours: '8', selfApprovalAcknowledged: false },
  })
  const plan = useQuery({
    queryKey: ['cross-dock', scope, 'plan'],
    enabled: canView && order.status === 'Pending',
    retry: false,
    queryFn: ({ signal }) => readCrossDock(() => crossDockService.plan(order.id, signal), signal),
    refetchInterval: 30000,
  })
  const demand = useQuery({
    queryKey: ['cross-dock', scope, 'demand'],
    enabled: canView,
    retry: false,
    queryFn: ({ signal }) => readCrossDock(() => crossDockService.demand(order.id, signal), signal),
    refetchInterval: awaitingAllocation ? 30000 : false,
    refetchOnWindowFocus: awaitingAllocation,
    refetchOnReconnect: awaitingAllocation,
  })
  const pickers = useQuery({
    queryKey: ['cross-dock', scope, 'pickers'],
    enabled: canManage && order.status === 'Pending' && plan.data?.automationEnabled === true,
    retry: false,
    queryFn: ({ signal }) =>
      readCrossDock(() => crossDockService.pickers(order.id, signal), signal),
  })
  const summary = useQuery({
    queryKey: ['cross-dock', scope, 'summary', range],
    enabled: canView && summaryOpen,
    retry: false,
    queryFn: ({ signal }) =>
      readCrossDock(
        () => crossDockService.summary(order.warehouseId, range.from, range.to, signal),
        signal
      ),
  })
  useEffect(() => {
    if (awaitingAllocation && demand.data?.completedAt)
      void client.invalidateQueries({
        queryKey: queryKeys.stockIssueRequests.detail(order.id),
        exact: true,
      })
  }, [awaitingAllocation, demand.data?.completedAt, order.id, client])
  const pending = demand.data && !demand.data.completedAt && !demand.data.revokedAt
  const writeReady =
    canManage && !me.isFetching && !demand.isError && !demand.isFetching && demand.isSuccess
  const authorizeReady =
    writeReady &&
    order.status === 'Pending' &&
    !!order.version &&
    !pending &&
    plan.isSuccess &&
    !plan.isError &&
    !plan.isFetching &&
    plan.data.documentVersion === order.version &&
    plan.data.stockIssueRequestId === order.id &&
    plan.data.automationEnabled &&
    pickers.isSuccess &&
    !pickers.isError &&
    !pickers.isFetching
  const mutation = useMutation({
    retry: false,
    mutationFn: async (intent: Confirmation) => {
      if (
        intent.scope !== scope ||
        !writeReady ||
        (intent.action === 'authorize' && !authorizeReady)
      )
        throw new Error('Quyền, phiên bản hoặc dữ liệu đã thay đổi. Vui lòng tải lại.')
      if (intent.action === 'authorize') {
        if (new Date(intent.body.validUntil).getTime() <= Date.now())
          throw new Error('Thời hạn xác nhận đã hết. Hãy mở lại thao tác.')
        await crossDockService.authorize(order.id, intent.body)
      } else await crossDockService.revoke(order.id, intent.demandId, intent.expectedVersion)
    },
    onError: (error) => {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật tự phân bổ.'))
    },
    onSuccess: async (_, intent) => {
      setStored(null)
      toast.success(
        intent.action === 'authorize'
          ? 'Đã cho phép tự phân bổ. Chưa xác nhận lấy hay xuất hàng.'
          : 'Đã thu hồi cho phép tự phân bổ.'
      )
      await Promise.all([
        client.invalidateQueries({ queryKey: ['cross-dock'] }),
        client.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        client.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ])
    },
  })
  const denied = [plan.error, demand.error, summary.error].some(
    (error) =>
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      [401, 403, 404].includes(Number(error.statusCode))
  )
  function reviewValues(values: CrossDockAuthorizationValues) {
    if (!authorizeReady || !pickers.data?.some((picker) => picker.id === values.assignedStaffId))
      return
    setStored({
      scope,
      action: 'authorize',
      body: authorizeCrossDockCommandSchema.parse({
        expectedVersion: order.version,
        commandId: crypto.randomUUID(),
        assignedStaffId: values.assignedStaffId,
        validUntil: new Date(Date.now() + Number(values.hours) * 3600000).toISOString(),
        selfApprovalAcknowledged: canSelfApprove && values.selfApprovalAcknowledged,
      }),
    })
  }
  return {
    scope,
    form,
    plan,
    demand,
    pickers,
    summary,
    range,
    setSummaryOpen,
    now,
    canView: canView && !denied,
    canManage,
    canSelfApprove,
    authorizeReady,
    writeReady,
    target,
    mutation,
    refresh: () => {
      void Promise.all([
        ...(order.status === 'Pending' ? [plan.refetch()] : []),
        demand.refetch(),
        ...(summaryOpen ? [summary.refetch()] : []),
        ...(canManage && order.status === 'Pending' && plan.data?.automationEnabled
          ? [pickers.refetch()]
          : []),
      ])
    },
    review: (event?: BaseSyntheticEvent) => {
      void form.handleSubmit(reviewValues)(event)
    },
    reviewRevoke: () => {
      if (writeReady && pending && demand.data?.version)
        setStored({
          scope,
          action: 'revoke',
          demandId: demand.data.id,
          expectedVersion: demand.data.version,
        })
    },
    cancel: () => {
      if (!mutation.isPending) setStored(null)
    },
    confirm: () => {
      if (target && !mutation.isPending) mutation.mutate(target)
    },
  }
}
