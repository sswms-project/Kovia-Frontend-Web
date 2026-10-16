'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BulkImportWorkspace,
  BulkImportDelimiter,
} from '@/components/operations/BulkImportWorkspace'
import { BulkImportHeader } from '@/components/operations/BulkImportHeader'
import { BulkImportMapping } from '@/components/operations/BulkImportMapping'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { useImportNavigation } from '@/components/operations/use-import-navigation'
import { Button } from '@/components/ui/button'
import { useInventoryWarehouseOptionsQuery } from '../hooks/use-inventory'
import { APP_ROUTES } from '@/routes/app-routes'
import { operationalToday } from '@/lib/operational-date-time'
import {
  openingStockImportSetupSchema,
  type OpeningStockImportSetup as SetupValues,
} from '../schemas/opening-stock-import.schema'
import { useOpeningStockImport } from '../hooks/use-opening-stock-import'
import { OpeningStockImportReview } from './OpeningStockImportReview'
import { OpeningStockImportSetup } from './OpeningStockImportSetup'
import { OpeningStockImportConfirmation } from './OpeningStockImportConfirmation'
import { OpeningStockImportResult } from './OpeningStockImportResult'
import { OpeningStockImportContextDialog } from './OpeningStockImportContextDialog'
import { getOpeningStockPendingLots } from '../utils/opening-stock-import'

export function OpeningStockImportSession() {
  const flow = useOpeningStockImport()
  const warehouses = useInventoryWarehouseOptionsQuery()
  const setupForm = useForm<SetupValues>({
    resolver: zodResolver(openingStockImportSetupSchema),
    defaultValues: { warehouseId: '', effectiveDate: operationalToday() },
  })
  const warehouseId = useWatch({ control: setupForm.control, name: 'warehouseId' })
  const effectiveDate = useWatch({ control: setupForm.control, name: 'effectiveDate' })
  const setWarehouseId = (value: string) =>
    setupForm.setValue('warehouseId', value, { shouldValidate: true })
  const setEffectiveDate = (value: string) =>
    setupForm.setValue('effectiveDate', value, { shouldValidate: true })
  const [delimiter, setDelimiter] = useState('auto')
  const [contextOpen, setContextOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ignoredAck, setIgnoredAck] = useState(false)
  const [acknowledgedLots, setAcknowledgedLots] = useState<string | null>(null)
  const busy = flow.activity !== 'idle'
  const navigation = useImportNavigation(
    Boolean(flow.file && !flow.resultId),
    busy || flow.uncertain
  )
  const pendingLots = getOpeningStockPendingLots(flow.preview?.rows ?? [], flow.selected)
  const lotScope = JSON.stringify({
    file: flow.preview?.fileHash,
    warehouse: flow.options?.warehouseId,
    date: flow.options?.effectiveDate,
    lots: pendingLots
      .map((row) => [row.productId, row.newLot])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  })
  const lotsAcknowledged = pendingLots.length === 0 || acknowledgedLots === lotScope
  const ignored = [...(flow.preview?.ignoredSheets ?? []), ...(flow.preview?.ignoredColumns ?? [])]
  const warehouseOptions = (warehouses.data ?? [])
    .filter((warehouse) => warehouse.canManageWarehouse)
    .map((warehouse) => ({
      value: warehouse.id,
      label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
    }))
  const warehouseLabel =
    warehouseOptions.find((warehouse) => warehouse.value === flow.options?.warehouseId)?.label ??
    '—'
  const setupProps = {
    warehouses: warehouseOptions,
    warehouseId,
    effectiveDate,
    busy: busy || warehouses.isPending,
    onWarehouseChange: setWarehouseId,
    onDateChange: setEffectiveDate,
    warehouseError: setupForm.formState.errors.warehouseId?.message,
    dateError: setupForm.formState.errors.effectiveDate?.message,
    warehouseRef: setupForm.register('warehouseId').ref,
    dateRef: setupForm.register('effectiveDate').ref,
  }
  async function validateSetup() {
    return (await setupForm.trigger(undefined, { shouldFocus: true }))
      ? setupForm.getValues()
      : null
  }
  return (
    <BulkImportWorkspace
      step={flow.step}
      activity={flow.activity}
      activityLabel={flow.activity === 'importing' ? 'Đang tạo phiếu nháp…' : undefined}
      header={
        <BulkImportHeader
          eyebrow="Tồn kho"
          title="Nhập tồn kho đầu kỳ"
          description="Tệp chỉ tạo phiếu nháp. Tồn kho chỉ tăng sau khi phiếu được duyệt."
          backHref={APP_ROUTES.inventoryOpeningStocks}
          backLabel="Về danh sách tồn đầu kỳ"
        >
          {null}
        </BulkImportHeader>
      }
    >
      {warehouses.isError ? (
        <p role="alert">
          Không tải được danh sách kho.{' '}
          <Button variant="outline" onClick={() => void warehouses.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : null}
      {!warehouses.isPending && !warehouses.isError && warehouseOptions.length === 0 ? (
        <p role="status" className="border p-3 text-sm">
          Bạn chưa được phân công vào kho đang hoạt động. Hãy liên hệ quản lý để được cấp phạm vi
          kho trước khi khai tồn đầu.
        </p>
      ) : null}
      {flow.step === 0 ? (
        <OpeningStockImportSetup
          {...setupProps}
          delimiter={delimiter}
          error={flow.error}
          onDelimiterChange={setDelimiter}
          onFileChange={async (file) => {
            const setup = await validateSetup()
            if (setup) void flow.inspect(file, setup, delimiter)
          }}
          onTemplate={(variant) => void flow.template(variant)}
        />
      ) : null}
      {flow.step === 1 && flow.inspection && flow.options ? (
        <>
          <p className="text-sm">
            {flow.file?.name} · {warehouseLabel} · Ngày ghi nhận: {flow.options.effectiveDate}
          </p>
          {flow.inspection.isCsv ? (
            <BulkImportDelimiter
              id="opening-mapping-delimiter"
              value={flow.options.spreadsheet.csvDelimiter}
              disabled={busy}
              onChange={(value) => {
                if (flow.file && flow.options) void flow.inspect(flow.file, flow.options, value)
              }}
            />
          ) : null}
          <BulkImportMapping
            inspection={flow.inspection}
            options={flow.options.spreadsheet}
            busy={busy}
            error={flow.error}
            onBack={() => navigation.requestDiscard(flow.reset)}
            onPreview={() => void flow.check()}
            onChange={flow.checkMapping}
          />
        </>
      ) : null}
      {flow.step === 2 && flow.preview ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              Kho: {warehouseLabel} · Ngày ghi nhận: {flow.preview.effectiveDate}
            </p>
            <Button
              variant="outline"
              disabled={busy || flow.uncertain}
              onClick={() => {
                setWarehouseId(flow.options!.warehouseId)
                setEffectiveDate(flow.options!.effectiveDate)
                setupForm.clearErrors()
                setContextOpen(true)
              }}
            >
              Đổi kho/ngày
            </Button>
          </div>
          {pendingLots.length ? (
            <section className="bg-card space-y-2 border p-3 text-sm">
              <details>
                <summary className="cursor-pointer font-medium">
                  {pendingLots.length} lô sẽ được tạo khi duyệt phiếu
                </summary>
                <ul className="mt-2 space-y-1 wrap-anywhere">
                  {pendingLots.map((row) => (
                    <li key={`${row.productId}|${row.lotNumber}`}>
                      {row.sku} · {row.lotNumber} · NSX: {row.manufacturedDate || '—'} · HSD:{' '}
                      {row.expiryDate || '—'}
                    </li>
                  ))}
                </ul>
              </details>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="accent-primary size-4 shrink-0"
                  checked={lotsAcknowledged}
                  disabled={busy || flow.uncertain}
                  onChange={(event) => setAcknowledgedLots(event.target.checked ? lotScope : null)}
                />
                Tôi xác nhận khai báo các lô mới này trong phiếu tồn kho đầu kỳ.
              </label>
            </section>
          ) : null}
          <OpeningStockImportReview
            preview={flow.preview}
            selected={flow.selected}
            busy={busy}
            locked={flow.uncertain}
            stale={flow.stale}
            canContinue={lotsAcknowledged}
            onSelect={flow.select}
            onRecheck={() => void flow.recheck()}
            onBack={flow.back}
            onContinue={() => {
              setIgnoredAck(false)
              setConfirmOpen(true)
            }}
          />
        </>
      ) : null}
      {flow.error && flow.step !== 0 && flow.step !== 1 ? (
        <p role="alert" className="border-destructive text-destructive border p-3 text-sm">
          {flow.error}
        </p>
      ) : null}
      {flow.uncertain ? (
        <section role="alert" className="space-y-3 border p-4">
          <p>Chưa xác định phiếu đã được tạo hay chưa. Không đóng trang hoặc tạo thao tác mới.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void flow.reconcile()}>
              Kiểm tra kết quả
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void flow.retryCommit()}>
              Thử lại cùng thao tác
            </Button>
          </div>
        </section>
      ) : null}
      {flow.step === 3 && flow.resultId && flow.preview ? (
        <OpeningStockImportResult
          id={flow.resultId}
          code={flow.resultCode}
          preview={flow.preview}
          selected={flow.selected}
          onRestart={flow.reset}
        />
      ) : null}
      <OpeningStockImportConfirmation
        open={confirmOpen}
        busy={busy}
        count={flow.selected.length}
        lots={pendingLots.length}
        warehouse={warehouseLabel}
        effectiveDate={flow.options?.effectiveDate ?? ''}
        ignored={ignored}
        ignoredAck={ignoredAck}
        onIgnoredAck={setIgnoredAck}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (!lotsAcknowledged) return
          await flow.commit(ignoredAck, lotsAcknowledged)
          setConfirmOpen(false)
        }}
      />
      <OpeningStockImportContextDialog
        {...setupProps}
        open={contextOpen}
        error={null}
        onOpenChange={setContextOpen}
        onApply={async () => {
          const setup = await validateSetup()
          if (setup) {
            flow.changeContext(setup)
            setContextOpen(false)
          }
        }}
      />
      <UnsavedChangesDialog
        open={navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) navigation.cancelDiscard()
        }}
        onDiscard={navigation.confirmDiscard}
      />
    </BulkImportWorkspace>
  )
}
