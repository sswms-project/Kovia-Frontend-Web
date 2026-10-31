'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { returnWorkService } from '../services/return-work.service'
import type { ReturnWorkProof } from '../types/return-work.types'

export function useReturnWork(supplier: boolean, documentId: string | null) {
  const client = useQueryClient()
  const intent = useRef<{ key: string; proof: ReturnWorkProof } | null>(null)
  const query = useQuery({
    queryKey: queryKeys.returnWork.document(supplier, documentId ?? ''),
    queryFn: () => returnWorkService.get(supplier, documentId!),
    enabled: Boolean(documentId),
  })
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.returnWork.all }),
      client.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
      client.invalidateQueries({
        queryKey: supplier ? queryKeys.supplierReturns.all : queryKeys.goodsReturnRequests.all,
      }),
    ])
  }
  function proof(payload: unknown, expectedVersion?: string | null): ReturnWorkProof | undefined {
    const data = query.data
    if (!data || query.isFetching || query.isError)
      throw new Error('Vui lòng tải lại trạng thái nhiệm vụ trước khi xác nhận.')
    if (!data.assignmentRequired) return undefined
    if (expectedVersion && data.documentVersion !== expectedVersion)
      throw new Error('Phiếu hoặc nhiệm vụ đã thay đổi. Vui lòng tải lại trước khi xác nhận.')
    if (!data.canComplete || !data.taskId || !data.taskVersion)
      throw new Error('Cần bắt đầu nhiệm vụ được giao trước khi xác nhận.')
    const key = JSON.stringify([
      supplier,
      data.sourceDocumentId,
      data.documentVersion,
      data.taskVersion,
      payload,
    ])
    if (intent.current?.key !== key)
      intent.current = {
        key,
        proof: {
          expectedVersion: data.documentVersion,
          taskId: data.taskId,
          taskVersion: data.taskVersion,
          commandId: crypto.randomUUID(),
        },
      }
    return intent.current.proof
  }
  return { query, refresh, proof }
}
