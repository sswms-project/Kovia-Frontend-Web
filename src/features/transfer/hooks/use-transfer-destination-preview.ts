'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import { transferDestinationPreviewSchema } from '../schemas/transfer-destination-preview.schema'
import { transferService } from '../services/transfer.service'
import { describeTransferLocationCapacity } from '../utils/transfer-location-capacity'

interface GeneratedDestination {
  readonly stamp: string
  readonly slotId: string
}

export function useTransferDestinationPreview({
  form,
  fields,
  lines,
  warehouseId,
  viewerId,
  enabled,
  blocked,
}: {
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly fields: readonly { readonly id: string }[]
  readonly lines: TransferRequestFormValues['lines']
  readonly warehouseId: string
  readonly viewerId?: string | null
  readonly enabled: boolean
  readonly blocked: boolean
}) {
  const [manual, setManual] = useState(() => new Set<string>())
  const [generated, setGenerated] = useState(() => new Map<string, GeneratedDestination>())
  const [known, setKnown] = useState<{
    warehouseId: string
    options: Record<string, LookupOption>
  }>({ warehouseId: '', options: {} })
  const manualKey = useCallback(
    (index: number) =>
      `${warehouseId}|${fields[index]?.id}|${form.getValues(`lines.${index}.productId`)}`,
    [warehouseId, fields, form]
  )
  const stamp = useCallback(
    () =>
      JSON.stringify([
        warehouseId,
        fields.map((field, index) => {
          const line = form.getValues(`lines.${index}`)
          const automatic = generated.get(field.id)?.slotId === line?.destinationSlotId
          return [
            field.id,
            line?.productId,
            line?.unitId,
            line?.quantity,
            manual.has(manualKey(index)),
            automatic ? null : line?.destinationSlotId || null,
          ]
        }),
      ]),
    [warehouseId, fields, form, generated, manual, manualKey]
  )
  const currentRequest = useCallback(() => {
    const items = fields.flatMap((field, index) => {
      const line = form.getValues(`lines.${index}`)
      if (!line?.destinationSlotId && manual.has(manualKey(index))) return []
      return line?.productId && Number.isFinite(line.quantity) && line.quantity > 0
        ? [
            {
              key: field.id,
              productId: line.productId,
              unitId: line.unitId || null,
              quantity: line.quantity,
              destinationSlotId: line.destinationSlotId || null,
            },
          ]
        : []
    })
    const parsed = transferDestinationPreviewSchema.safeParse({ warehouseId, items })
    return parsed.success ? parsed.data : null
  }, [warehouseId, fields, form, manual, manualKey])
  const request = currentRequest()
  const requestKey = JSON.stringify(request)
  const debouncedKey = useDebouncedValue(requestKey, 400)
  const hasBlank = fields.some(
    (_, index) =>
      lines[index]?.productId && !lines[index]?.destinationSlotId && !manual.has(manualKey(index))
  )
  const active = enabled && !blocked && hasBlank && request !== null && requestKey === debouncedKey
  const query = useQuery({
    queryKey: ['transfers', 'destination-preview', viewerId, debouncedKey],
    queryFn: ({ signal }) => {
      if (!request) throw new Error('Chưa đủ thông tin để gợi ý vị trí.')
      return transferService.previewDestinations(request, signal).then((response) => response.data)
    },
    enabled: active,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Synchronize the external React Hook Form store with query results and their generated-label metadata together.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled || blocked) return
    const currentStamp = stamp()
    const liveIds = new Set(fields.map((field) => field.id))
    const nextGenerated = new Map([...generated].filter(([id]) => liveIds.has(id)))
    let cleared = nextGenerated.size !== generated.size
    fields.forEach((field, index) => {
      const previous = generated.get(field.id)
      if (previous && previous.stamp !== currentStamp) {
        if (form.getValues(`lines.${index}.destinationSlotId`) === previous.slotId)
          form.setValue(`lines.${index}.destinationSlotId`, '', { shouldDirty: true })
        nextGenerated.delete(field.id)
        cleared = true
      }
    })
    if (cleared) {
      setGenerated(nextGenerated)
      return
    }
    // Compare the whole current form, not row indexes captured before the network request.
    if (
      !active ||
      !query.data ||
      query.isFetching ||
      query.isError ||
      JSON.stringify(currentRequest()) !== debouncedKey
    )
      return
    for (const suggestion of query.data) {
      const index = fields.findIndex((field) => field.id === suggestion.key)
      if (
        index < 0 ||
        !suggestion.slotId ||
        !suggestion.path ||
        manual.has(manualKey(index)) ||
        form.getValues(`lines.${index}.destinationSlotId`)
      )
        continue
      nextGenerated.set(suggestion.key, { stamp: currentStamp, slotId: suggestion.slotId })
      form.setValue(`lines.${index}.destinationSlotId`, suggestion.slotId, {
        shouldDirty: true,
        shouldValidate: false,
      })
      const option = {
        value: suggestion.slotId,
        label: suggestion.path,
        description: describeTransferLocationCapacity(suggestion.capacitySummary),
      }
      setKnown((previous) => ({
        warehouseId,
        options: {
          ...(previous.warehouseId === warehouseId ? previous.options : {}),
          [option.value]: option,
        },
      }))
    }
    if (nextGenerated.size !== generated.size) setGenerated(nextGenerated)
  }, [
    enabled,
    blocked,
    fields,
    active,
    query.data,
    query.isFetching,
    query.isError,
    currentRequest,
    requestKey,
    debouncedKey,
    stamp,
    form,
    manualKey,
    warehouseId,
    generated,
    manual,
  ])
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    options: known.warehouseId === warehouseId ? known.options : {},
    markManual: (index: number) => {
      setManual((previous) => new Set(previous).add(manualKey(index)))
      const field = fields[index]
      if (field)
        setGenerated((previous) => {
          const next = new Map(previous)
          next.delete(field.id)
          return next
        })
    },
    note: (index: number) => {
      const field = fields[index]
      if (!enabled || !field || !lines[index]?.productId || manual.has(manualKey(index)))
        return undefined
      if (generated.get(field.id)?.slotId === lines[index]?.destinationSlotId)
        return 'Gợi ý theo quy tắc kho; bạn có thể đổi vị trí. Chưa giữ chỗ.'
      if (lines[index]?.destinationSlotId) return undefined
      if (query.isError && requestKey === debouncedKey)
        return 'Chưa tải được gợi ý. Bạn vẫn có thể chọn vị trí trong danh sách.'
      if (query.isFetching || requestKey !== debouncedKey) return 'Đang tìm vị trí phù hợp…'
      return query.data?.find((item) => item.key === field.id)?.reason
    },
  }
}
