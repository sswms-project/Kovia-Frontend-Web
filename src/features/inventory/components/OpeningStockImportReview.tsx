'use client'

import { useState } from 'react'
import {
  BulkImportFieldCell,
  BulkImportRowResult,
} from '@/components/operations/BulkImportFeedback'
import {
  BulkImportReviewHeader,
  BulkImportSummary,
  BulkImportSupplementaryToggle,
} from '@/components/operations/BulkImportWorkspace'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { bulkImportResultsCsv, downloadBulkImportFile } from '@/components/operations/bulk-import'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  OpeningStockImportPreview,
  OpeningStockImportRow,
} from '../types/opening-stock-import.types'

const eligibilityLabels = {
  Available: 'Được sử dụng',
  InspectionHold: 'Chờ kiểm tra',
  DamageHold: 'Giữ do hư hỏng',
  Quarantine: 'Cách ly',
}
function Lot({ row }: { readonly row: OpeningStockImportRow }) {
  return (
    <>
      <span>{row.lotNumber || row.rawValues.lotNumber || 'Không theo lô'}</span>
      {row.newLot ? <p className="text-primary text-xs">Sẽ tạo lô khi duyệt</p> : null}
    </>
  )
}
export function OpeningStockImportReview({
  preview,
  selected,
  busy,
  locked,
  stale,
  canContinue = true,
  onSelect,
  onRecheck,
  onBack,
  onContinue,
}: {
  readonly preview: OpeningStockImportPreview
  readonly selected: readonly string[]
  readonly busy: boolean
  readonly locked: boolean
  readonly stale: boolean
  readonly canContinue?: boolean
  readonly onSelect: (keys: readonly string[]) => void
  readonly onRecheck: () => void
  readonly onBack: () => void
  readonly onContinue: () => void
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const rows = preview.rows.filter(
    (r) =>
      `${r.sku} ${r.productName} ${r.locationLabel} ${r.lotNumber ?? ''}`
        .toLocaleLowerCase('vi')
        .includes(search.toLocaleLowerCase('vi')) &&
      (filter === 'all' || (filter === 'valid' ? r.isValid : !r.isValid))
  )
  const visible = rows.slice((page - 1) * pageSize, page * pageSize)
  function checkbox(row: OpeningStockImportRow) {
    return (
      <input
        type="checkbox"
        className="accent-primary size-4"
        aria-label={`Chọn dòng ${row.rowNumber}: ${row.sku}`}
        disabled={busy || locked || !row.isValid}
        checked={selected.includes(row.rowKey)}
        onChange={(e) =>
          onSelect(
            e.target.checked ? [...selected, row.rowKey] : selected.filter((k) => k !== row.rowKey)
          )
        }
      />
    )
  }
  return (
    <>
      <BulkImportSummary
        total={preview.totalCount}
        valid={preview.validCount}
        invalidLabel="Cần sửa"
      />
      <OperationalListPanel
        className="flex-none shrink-0 rounded-none [&>footer_button]:min-h-11 [&>footer_button]:min-w-11 [&>header_button]:min-h-11 [&>header_select]:min-h-11"
        aria-label="Kiểm tra tồn đầu kỳ"
        aria-busy={busy}
      >
        <BulkImportReviewHeader
          fileName={preview.fileName}
          selected={selected.length}
          valid={preview.validCount}
        >
          <BulkImportSupplementaryToggle
            expanded={expanded}
            controls="opening-import-supplementary"
            errorCount={preview.rows.reduce(
              (count, row) =>
                count +
                Object.entries(row.fieldErrors)
                  .filter(([field]) =>
                    [
                      'manufacturedDate',
                      'expiryDate',
                      'qualityStatus',
                      'eligibilityStatus',
                    ].includes(field)
                  )
                  .reduce((sum, [, errors]) => sum + errors.length, 0),
              0
            )}
            onToggle={() => setExpanded(!expanded)}
          />
          <Input
            aria-label="Tìm hàng hóa hoặc vị trí"
            className="w-full sm:w-64"
            placeholder="Tìm mã, tên, vị trí…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <NativeSelect
            aria-label="Lọc kết quả kiểm tra"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setPage(1)
            }}
          >
            <NativeSelectOption value="all">Tất cả</NativeSelectOption>
            <NativeSelectOption value="valid">Hợp lệ</NativeSelectOption>
            <NativeSelectOption value="invalid">Cần sửa</NativeSelectOption>
          </NativeSelect>
          <Button
            variant="outline"
            disabled={busy || locked}
            onClick={() => onSelect(preview.rows.filter((r) => r.isValid).map((r) => r.rowKey))}
          >
            Chọn tất cả dòng hợp lệ trong tệp
          </Button>
          <Button
            variant="outline"
            disabled={busy || locked || !selected.length}
            onClick={() => onSelect([])}
          >
            Bỏ chọn cả tệp
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadBulkImportFile(
                new Blob(
                  [
                    '\uFEFF',
                    bulkImportResultsCsv(
                      preview.rows.map((row) => ({
                        rowNumber: row.rowNumber,
                        label: `${row.sheetName} · ${row.sku} · ${row.productName} · ${row.locationLabel}`,
                        result: [
                          ...row.errors,
                          ...row.warnings,
                          row.isValid
                            ? selected.includes(row.rowKey)
                              ? 'Đã chọn'
                              : 'Không chọn'
                            : 'Không hợp lệ',
                        ].join(' | '),
                      }))
                    ),
                  ],
                  { type: 'text/csv;charset=utf-8' }
                ),
                'Kiem_tra_ton_dau_ky.csv'
              )
            }
          >
            Xuất báo cáo cả tệp
          </Button>
        </BulkImportReviewHeader>
        <div data-slot="operational-list-body" id="opening-import-supplementary">
          <div className="hidden lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      aria-label="Chọn các dòng hợp lệ ở trang này"
                      className="accent-primary size-4"
                      disabled={busy || locked || !visible.some((row) => row.isValid)}
                      checked={
                        visible.some((row) => row.isValid) &&
                        visible
                          .filter((row) => row.isValid)
                          .every((row) => selected.includes(row.rowKey))
                      }
                      onChange={(event) =>
                        onSelect(
                          event.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.filter((row) => row.isValid).map((row) => row.rowKey),
                                ]),
                              ]
                            : selected.filter((key) => !visible.some((row) => row.rowKey === key))
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-20">Dòng</TableHead>
                  <TableHead className="w-64">Kết quả kiểm tra</TableHead>
                  <TableHead>Hàng hóa</TableHead>
                  <TableHead>Vị trí/kệ</TableHead>
                  <TableHead className="w-28">Số lượng</TableHead>
                  <TableHead>Lô</TableHead>
                  {expanded ? <TableHead>Thông tin bổ sung</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.rowKey}>
                    <TableCell>{checkbox(row)}</TableCell>
                    <TableCell className="wrap-anywhere whitespace-normal">
                      {row.sheetName}:{row.rowNumber}
                    </TableCell>
                    <TableCell>
                      <BulkImportRowResult errors={row.errors} warnings={row.warnings} />
                    </TableCell>
                    <BulkImportFieldCell errors={row.fieldErrors.sku}>
                      <p className="font-mono text-xs">{row.sku || row.rawValues.sku || '—'}</p>
                      {row.productName}
                    </BulkImportFieldCell>
                    <BulkImportFieldCell errors={row.fieldErrors.locationCode}>
                      {row.locationLabel || row.rawValues.locationCode || '—'}
                    </BulkImportFieldCell>
                    <BulkImportFieldCell
                      errors={[
                        ...(row.fieldErrors.quantity ?? []),
                        ...(row.fieldErrors.unit ?? []),
                      ]}
                    >
                      {row.quantityText ?? row.rawValues.quantity ?? '—'} {row.unitName}
                    </BulkImportFieldCell>
                    <BulkImportFieldCell errors={row.fieldErrors.lotNumber}>
                      <Lot row={row} />
                    </BulkImportFieldCell>
                    {expanded ? (
                      <TableCell className="animate-in fade-in text-xs wrap-anywhere whitespace-normal motion-reduce:animate-none">
                        {row.qualityStatus === 'Good' ? 'Hàng tốt' : 'Hàng hỏng'} ·{' '}
                        {eligibilityLabels[row.eligibilityStatus]}
                        <p>Ngày sản xuất: {row.manufacturedDate || '—'}</p>
                        <p>Hạn dùng: {row.expiryDate || '—'}</p>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y lg:hidden">
            {visible.map((row) => (
              <article key={row.rowKey} className="space-y-2 p-3 text-sm wrap-anywhere">
                <label className="flex min-h-11 items-center gap-3">
                  {checkbox(row)}
                  <span>
                    Dòng {row.rowNumber} · {row.sku} · {row.productName}
                  </span>
                </label>
                <BulkImportRowResult errors={row.errors} warnings={row.warnings} />
                <p>Vị trí/kệ: {row.locationLabel || row.rawValues.locationCode || '—'}</p>
                <p>
                  Số lượng: {row.quantityText ?? row.rawValues.quantity} {row.unitName}
                </p>
                <Lot row={row} />
                {expanded ? (
                  <p>
                    {row.qualityStatus === 'Good' ? 'Hàng tốt' : 'Hàng hỏng'} ·{' '}
                    {eligibilityLabels[row.eligibilityStatus]} · NSX: {row.manufacturedDate || '—'}{' '}
                    · HSD: {row.expiryDate || '—'}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        {!visible.length ? <p className="p-4 text-sm">Không có dòng phù hợp.</p> : null}
        <OperationalPagination
          page={page}
          pageSize={pageSize}
          totalCount={rows.length}
          isPending={busy}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </OperationalListPanel>
      {stale ? (
        <p role="status" className="text-sm">
          Lựa chọn đã đổi. Hãy kiểm tra lại tổng sức chứa trước khi tạo phiếu.
        </p>
      ) : null}
      {preview.selectionErrors.length ? (
        <div role="alert" className="border-destructive text-destructive border p-3 text-sm">
          {preview.selectionErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button className="min-h-11" variant="outline" disabled={busy || locked} onClick={onBack}>
          Quay lại ghép cột
        </Button>
        <Button
          className="min-h-11"
          variant="outline"
          disabled={busy || locked || !selected.length}
          onClick={onRecheck}
        >
          Kiểm tra lại lựa chọn
        </Button>
        <Button
          className="min-h-11"
          disabled={
            busy ||
            locked ||
            stale ||
            !canContinue ||
            !selected.length ||
            Boolean(preview.selectionErrors.length)
          }
          onClick={onContinue}
        >
          Tạo phiếu nháp ({selected.length} dòng)
        </Button>
      </div>
    </>
  )
}
