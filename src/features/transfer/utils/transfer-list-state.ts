import type { Route } from 'next'
import { TRANSFER_WORKFLOW_STATUSES, type TransferWorkflowStatus } from '../types/transfer.types'

export function readTransferListState(params: Pick<URLSearchParams, 'get'>) {
  const candidate = params.get('status')
  const status: TransferWorkflowStatus | '' =
    TRANSFER_WORKFLOW_STATUSES.find((status) => status === candidate) ??
    (params.get('tab') === 'transfer'
      ? 'InProgress'
      : params.get('tab') === 'discrepancy'
        ? 'AwaitingResolution'
        : '')
  const parsedPage = Number(params.get('page') ?? 1)
  const parsedSize = Number(params.get('pageSize') ?? 10)
  return {
    status,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1,
    pageSize: [10, 20, 30, 50].includes(parsedSize) ? parsedSize : 10,
    search: params.get('search') ?? '',
  }
}

export function transferStatusHref(
  path: string,
  query: string,
  status: TransferWorkflowStatus | ''
) {
  const params = new URLSearchParams(query)
  params.delete('tab')
  params.delete('page')
  if (status) params.set('status', status)
  else params.delete('status')
  return (params.size ? `${path}?${params}` : path) as Route
}
