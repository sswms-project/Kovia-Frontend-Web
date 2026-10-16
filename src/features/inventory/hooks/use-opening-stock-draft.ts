import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CreateOpeningStockRequest } from '../types/inventory.types'
import { openingStockImportService } from '../services/opening-stock-import.service'
import { useCreateOpeningStockMutation, useUploadInventoryEvidenceMutation } from './use-inventory'

type DraftInput = Omit<CreateOpeningStockRequest, 'commandId' | 'evidenceIds'> & { file?: File }
export function useOpeningStockDraft() {
  const upload = useUploadInventoryEvidenceMutation()
  const create = useCreateOpeningStockMutation()
  const client = useQueryClient()
  const lock = useRef(false)
  const attempt = useRef<{
    file?: File
    signature: string
    request: CreateOpeningStockRequest
  } | null>(null)
  const [uncertain, setUncertain] = useState(false)
  async function complete() {
    attempt.current = null
    setUncertain(false)
    await client.invalidateQueries({ queryKey: ['inventory'] })
  }
  async function save({ file, ...input }: DraftInput) {
    if (lock.current) throw new Error('Đang xử lý phiếu, vui lòng đợi.')
    lock.current = true
    try {
      const signature = JSON.stringify(input)
      let pending = attempt.current
      if (pending && (pending.file !== file || pending.signature !== signature))
        throw new Error(
          'Kết quả lần tạo trước chưa rõ. Giữ nguyên dữ liệu và kiểm tra lại cùng thao tác trước khi thay đổi.'
        )
      if (pending && uncertain) {
        const outcome = await openingStockImportService.operation(pending.request.commandId)
        if (outcome.status === 'Completed') {
          await complete()
          return
        }
      }
      if (!pending) {
        const evidence = file
          ? await upload.mutateAsync({ warehouseId: input.warehouseId, file })
          : null
        pending = {
          file,
          signature,
          request: {
            ...input,
            evidenceIds: evidence ? [evidence.data.id] : [],
            commandId: crypto.randomUUID(),
          },
        }
        attempt.current = pending
      }
      try {
        await create.mutateAsync(pending.request)
        await complete()
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0
        const codes =
          error && typeof error === 'object' && 'errors' in error
            ? ((error.errors as Record<string, string[]> | undefined)?.errorCode ?? [])
            : []
        const rejected =
          (status >= 400 && status < 500 && status !== 409) ||
          codes.some((code) =>
            [
              'OPENING_STOCK_SCOPE_ALREADY_USED',
              'OPENING_STOCK_EXISTING_BALANCE_WITHOUT_LEDGER',
              'OPENING_STOCK_LOT_CHANGED',
            ].includes(code)
          )
        if (rejected) {
          attempt.current = null
          setUncertain(false)
        } else {
          setUncertain(true)
          try {
            const outcome = await openingStockImportService.operation(pending.request.commandId)
            if (outcome.status === 'Completed') {
              await complete()
              return
            }
          } catch {
            /* Keep the same command/evidence; the page reports the original failure. */
          }
        }
        throw error
      }
    } finally {
      lock.current = false
    }
  }
  return { save, uncertain, isPending: upload.isPending || create.isPending }
}
