'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferPutAwaySheetRow } from '../../types/transfer-receipt.types'
import type { ReceiptPlanState } from '../../utils/transfer-receive-plan'
import { putAwayRowKey } from '../../utils/transfer-putaway'
import { TransferPutAwayEntryCard } from './TransferPutAwayEntryCard'

interface Props extends Omit<
  ComponentProps<typeof TransferPutAwayEntryCard>,
  | 'index'
  | 'row'
  | 'canRemove'
  | 'planState'
  | 'planChanged'
  | 'hideHeader'
  | 'cameraTarget'
  | 'onCameraTargetChange'
> {
  readonly fields: readonly { id: string }[]
  readonly rows: readonly TransferPutAwaySheetRow[]
  readonly planStates: readonly ReceiptPlanState[]
  readonly changedLines: ReadonlySet<string>
  readonly validationAttempt?: number
}

/** Một khối cho mỗi hàng/lô; phân bổ nhiều vị trí không lặp lại tiêu đề và số thực nhận. */
export function TransferPutAwayForm({
  fields,
  rows,
  planStates,
  changedLines,
  validationAttempt = 0,
  ...entryProps
}: Props) {
  const entries = entryProps.form.watch('entries')
  const errors = entryProps.form.formState.errors.entries
  const rootRef = useRef<HTMLDivElement>(null)
  const [collapse, setCollapse] = useState({ attempt: 0, keys: new Set<string>() })
  const [camera, setCamera] = useState<{ entryId: string; target: 'slot' | 'product' } | null>(null)
  const groups = rows
    .filter((row) => row.qualityStatus === 'Good' && row.remainingQuantity > 0)
    .map((row) => {
      const indices = entries.flatMap((entry, index) =>
        putAwayRowKey(entry) === putAwayRowKey(row) ? [index] : []
      )
      const messages = indices.flatMap((index) =>
        Object.values(errors?.[index] ?? {}).flatMap((error) =>
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
            ? [error.message]
            : []
        )
      )
      return { row, indices, key: putAwayRowKey(row), messages: [...new Set(messages)] }
    })
  const invalidGroups = groups.filter((group) => group.messages.length > 0)
  // Đồng bộ ngay lượt xác nhận: nội dung phải được mount trước khi chuyển focus.
  if (collapse.attempt !== validationAttempt) {
    const keys = new Set(collapse.keys)
    invalidGroups.forEach((group) => keys.delete(group.key))
    setCollapse({ attempt: validationAttempt, keys })
  }
  useEffect(() => {
    if (!validationAttempt) return
    const frame = window.requestAnimationFrame(() => {
      const firstInvalid = rootRef.current?.querySelector<HTMLElement>(
        'input[aria-invalid="true"]:not(:disabled), button[aria-invalid="true"]:not(:disabled), [data-invalid="true"] button:not(:disabled)'
      )
      const target =
        firstInvalid ?? rootRef.current?.querySelector<HTMLElement>('[data-validation-summary]')
      target?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [validationAttempt])
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {invalidGroups.length > 0 ? (
        <Alert
          variant="destructive"
          aria-label="Lỗi dữ liệu cất hàng"
          aria-live="polite"
          tabIndex={-1}
          data-validation-summary
        >
          <AlertTitle>Cần kiểm tra {invalidGroups.length} dòng hàng trước khi cất</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {invalidGroups.map(({ row, key, messages }) => (
                <li key={key} className="break-words">
                  <strong>
                    {row.sku}
                    {row.lotNumber ? ` · Lô ${row.lotNumber}` : ''}:
                  </strong>{' '}
                  {messages.join(' ')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {groups.map(({ row, indices, key }) =>
        indices.length ? (
          <Collapsible
            key={key}
            open={!collapse.keys.has(key)}
            onOpenChange={(open) => {
              if (!open && indices.some((index) => fields[index]?.id === camera?.entryId))
                setCamera(null)
              setCollapse((current) => {
                const keys = new Set(current.keys)
                if (open) keys.delete(key)
                else keys.add(key)
                return { ...current, keys }
              })
            }}
            className="bg-card border"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold break-words">
                  {row.sku} · {row.productName}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {row.lotNumber ? `Lô ${row.lotNumber}` : 'Không theo lô'} · {row.baseUnitName}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  Thực nhận tốt {formatQuantity(row.actualQuantity)} · Đã cất{' '}
                  {formatQuantity(row.putAwayQuantity)} · Còn cất{' '}
                  <strong>{formatQuantity(row.remainingQuantity)}</strong>
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  aria-label={`Mở/thu gọn phân bổ ${row.sku}`}
                  className="group h-11 md:h-8 pointer-coarse:h-11"
                >
                  Phân bổ {indices.length} vị trí
                  <ChevronDown
                    aria-hidden="true"
                    className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  />
                </Button>
              </CollapsibleTrigger>
            </header>
            <CollapsibleContent className="motion-reduce:animate-none">
              <div className="flex flex-col gap-2 p-2">
                {indices.map((index) => {
                  const entryId = fields[index]?.id
                  return entryId ? (
                    <TransferPutAwayEntryCard
                      {...entryProps}
                      key={entryId}
                      index={index}
                      row={row}
                      hideHeader
                      planState={planStates[index]}
                      planChanged={changedLines.has(row.lineId)}
                      canRemove={indices.length > 1}
                      cameraTarget={camera?.entryId === entryId ? camera.target : null}
                      onCameraTargetChange={(target) =>
                        setCamera((current) =>
                          target
                            ? { entryId, target }
                            : current?.entryId === entryId
                              ? null
                              : current
                        )
                      }
                    />
                  ) : null
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null
      )}
    </div>
  )
}
