import { useState } from 'react'
import {
  BulkImportFieldCell,
  BulkImportRowResult,
} from '@/components/operations/BulkImportFeedback'
import {
  BulkImportReviewHeader,
  BulkImportSupplementaryToggle,
} from '@/components/operations/BulkImportWorkspace'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { WarehouseLocationImportTabs } from './WarehouseLocationImportTabs'
import type { WarehouseLocationImportKind } from '../../schemas/warehouse-location-import.schema'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
  WarehouseLocationImportRow,
} from '../../types/warehouse-location-import.types'
import {
  LOCATION_IMPORT_KINDS,
  LOCATION_IMPORT_LABELS,
} from '../../utils/warehouse-location-import'

const MAIN_FIELDS = new Set([
  'zoneCode',
  'zoneName',
  'rackCode',
  'rackName',
  'storageMode',
  'slotCode',
  'slotName',
  'capacityType',
  'capacity',
  'capacityUnitCode',
  'allowsMixedProducts',
])
interface TabView {
  search: string
  action: string
  expanded: boolean
  page: number
  pageSize: number
}
const DEFAULT_TAB_VIEW: TabView = {
  search: '',
  action: 'all',
  expanded: false,
  page: 1,
  pageSize: 20,
}
const VALUE_LABELS: Record<string, string> = {
  RackLevel: 'Theo kệ',
  SlotLevel: 'Theo ô',
  None: 'Không giới hạn',
  Quantity: 'Theo số lượng',
  true: 'Có',
  false: 'Không',
  Kilometer: 'km',
  Decimeter: 'dm',
  Centimeter: 'cm',
  Meter: 'm',
  Gram: 'g',
  Kilogram: 'kg',
  Ton: 'tấn',
}

export function WarehouseLocationImportReview({
  preview,
  inspection,
  selected,
  busy,
  imported,
  onSelect,
  onExport,
}: {
  readonly preview: WarehouseLocationImportPreview
  readonly inspection: WarehouseLocationImportInspection
  readonly selected: ReadonlySet<string>
  readonly busy: boolean
  readonly imported?: ReadonlySet<string>
  readonly onSelect: (selected: ReadonlySet<string>) => void
  readonly onExport: () => void
}) {
  const kinds = LOCATION_IMPORT_KINDS.filter((kind) =>
    preview.rows.some((row) => row.kind === kind)
  )
  const [kind, setKind] = useState<WarehouseLocationImportKind>(kinds[0] ?? 'Slot')
  const [tabViews, setTabViews] = useState<Record<WarehouseLocationImportKind, TabView>>({
    Zone: DEFAULT_TAB_VIEW,
    Rack: DEFAULT_TAB_VIEW,
    Slot: DEFAULT_TAB_VIEW,
  })
  const { search, action, expanded, page, pageSize } = tabViews[kind]
  function changeView(patch: Partial<TabView>) {
    setTabViews((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }))
  }
  const fields = (inspection.fieldsByKind[kind] ?? []).filter(
    (field) => expanded || MAIN_FIELDS.has(field.field)
  )
  const valid = preview.rows.filter((row) => row.canSelect)
  const kindRows = preview.rows.filter((row) => row.kind === kind)
  const selectedKind = kindRows.filter((row) => selected.has(row.rowKey)).length
  const invalidKind = kindRows.filter((row) => row.issues.length > 0).length
  const filtered = preview.rows.filter(
    (row) =>
      row.kind === kind &&
      (action === 'all' || row.action === action) &&
      [row.displayPath, ...Object.values(row.values), ...row.issues.map((issue) => issue.message)]
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(search.trim().toLocaleLowerCase('vi'))
  )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectable = visible.filter((row) => row.canSelect)
  const selectedPage = selectable.filter((row) => selected.has(row.rowKey)).length
  function selectPage(checked: boolean) {
    const next = new Set(selected)
    for (const row of selectable) {
      if (checked) next.add(row.rowKey)
      else next.delete(row.rowKey)
    }
    onSelect(next)
  }
  function result(row: WarehouseLocationImportRow) {
    if (imported)
      return (
        <div className="space-y-1">
          <Badge
            className="whitespace-normal"
            variant={imported.has(row.rowKey) ? 'default' : 'outline'}
          >
            {imported.has(row.rowKey)
              ? 'Đã nhập'
              : row.action === 'Reference'
                ? 'Đã có — không tạo lại'
                : 'Không nhập'}
          </Badge>
          {row.issues.length ? (
            <ul className="text-destructive wrap-anywhere whitespace-normal">
              {row.issues.map((issue, index) => (
                <li key={`${issue.field}-${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )
    if (row.action === 'Reference')
      return (
        <Badge variant="outline" className="whitespace-normal">
          Đã có — không tạo lại
        </Badge>
      )
    return (
      <BulkImportRowResult
        errors={row.issues.map((issue) => issue.message)}
        pinned={row.issues
          .filter((issue) => !fields.some((field) => field.field === issue.field))
          .map((issue) => issue.message)}
        valid={row.canSelect}
      >
        {row.canSelect ? <Badge variant="outline">Sẽ tạo mới</Badge> : null}
      </BulkImportRowResult>
    )
  }
  return (
    <Tabs
      value={kind}
      onValueChange={(value) => {
        setKind(value as WarehouseLocationImportKind)
      }}
    >
      <WarehouseLocationImportTabs
        kinds={kinds}
        label="Chọn bảng để kiểm tra dữ liệu"
        rows={preview.rows}
      />
      <TabsContent value={kind}>
        <OperationalListPanel
          aria-label={imported ? 'Kết quả nhập cấu trúc kho' : 'Bản xem trước cấu trúc kho'}
          className="flex-none shrink-0 [&>[data-slot=table-container]]:flex-none [&>[data-slot=table-container]]:overflow-x-auto [&>[data-slot=table-container]]:overflow-y-hidden"
        >
          <BulkImportReviewHeader
            fileName={preview.fileName}
            selected={selected.size}
            valid={valid.length}
          >
            <BulkImportSupplementaryToggle
              expanded={expanded}
              controls="location-import-table"
              onToggle={() => changeView({ expanded: !expanded })}
              errorCount={preview.rows
                .filter((row) => row.kind === kind)
                .reduce(
                  (count, row) =>
                    count + row.issues.filter((issue) => !MAIN_FIELDS.has(issue.field)).length,
                  0
                )}
            />
            <Input
              aria-label="Tìm mã, tên hoặc lỗi cấu trúc"
              placeholder="Tìm mã, tên hoặc lỗi…"
              value={search}
              onChange={(event) => {
                changeView({ search: event.target.value, page: 1 })
              }}
              className="w-full sm:w-60"
            />
            <NativeSelect
              aria-label="Lọc hành động của dòng"
              value={action}
              onChange={(event) => {
                changeView({ action: event.target.value, page: 1 })
              }}
            >
              <NativeSelectOption value="all">Tất cả</NativeSelectOption>
              <NativeSelectOption value="Create">Sẽ tạo mới</NativeSelectOption>
              <NativeSelectOption value="Reference">Đã có</NativeSelectOption>
              <NativeSelectOption value="Invalid">Cần sửa</NativeSelectOption>
            </NativeSelect>
            {!imported ? (
              <>
                <Button
                  variant="outline"
                  disabled={busy || selected.size === valid.length}
                  onClick={() => onSelect(new Set(valid.map((row) => row.rowKey)))}
                >
                  Chọn cả tệp
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !selected.size}
                  onClick={() => onSelect(new Set())}
                >
                  Bỏ chọn cả tệp
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={onExport}>
              Xuất báo cáo
            </Button>
          </BulkImportReviewHeader>
          <div
            className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{LOCATION_IMPORT_LABELS[kind]}</strong>
              {imported ? (
                <Badge variant="outline">
                  Đã nhập {kindRows.filter((row) => imported.has(row.rowKey)).length} dòng
                </Badge>
              ) : (
                <Badge variant="outline">Đã chọn {selectedKind} dòng</Badge>
              )}
              {invalidKind > 0 ? (
                <Badge variant="destructive">{invalidKind} dòng cần sửa</Badge>
              ) : null}
            </div>
            {!imported ? (
              <p className="text-muted-foreground">
                Chọn cả tệp áp dụng cho cả khu vực, kệ và vị trí.
              </p>
            ) : null}
          </div>
          <Table
            id="location-import-table"
            className="table-fixed"
            style={{ minWidth: `${420 + fields.length * 160}px` }}
          >
            <colgroup>
              {!imported ? <col className="w-12" /> : null}
              <col className="w-28" />
              <col className="w-64" />
              {fields.map((field) => (
                <col key={field.field} className="w-40" />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow>
                {!imported ? (
                  <TableHead>
                    <Checkbox
                      aria-label="Chọn các dòng tạo mới trên trang này"
                      checked={
                        selectedPage > 0 && selectedPage < selectable.length
                          ? 'indeterminate'
                          : selectable.length > 0 && selectedPage === selectable.length
                      }
                      disabled={busy || !selectable.length}
                      onCheckedChange={(checked) => selectPage(checked === true)}
                    />
                  </TableHead>
                ) : null}
                <TableHead>Dòng nguồn</TableHead>
                <TableHead>Kết quả</TableHead>
                {fields.map((field) => (
                  <TableHead key={field.field} className="whitespace-normal">
                    {field.displayName}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length ? (
                visible.map((row) => (
                  <TableRow
                    key={row.rowKey}
                    data-state={selected.has(row.rowKey) ? 'selected' : undefined}
                  >
                    {!imported ? (
                      <TableCell className="align-top">
                        {row.canSelect ? (
                          <Checkbox
                            aria-label={`Chọn ${row.displayPath}, dòng ${row.source.rowNumber}`}
                            checked={selected.has(row.rowKey)}
                            disabled={busy}
                            onCheckedChange={(checked) => {
                              const next = new Set(selected)
                              if (checked === true) next.add(row.rowKey)
                              else next.delete(row.rowKey)
                              onSelect(next)
                            }}
                          />
                        ) : (
                          <span
                            className="text-muted-foreground"
                            title="Chỉ chọn được dòng sẽ tạo mới và không có lỗi"
                          >
                            —
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="align-top wrap-anywhere whitespace-normal">
                      {row.source.sheetName}:{row.source.rowNumber}
                    </TableCell>
                    <TableCell className="align-top">{result(row)}</TableCell>
                    {fields.map((field) => {
                      const value = row.sourceValues[field.field] || row.values[field.field] || '—'
                      return (
                        <BulkImportFieldCell
                          key={field.field}
                          errors={row.fieldErrors[field.field]}
                          className="align-top"
                        >
                          {[
                            'storageMode',
                            'capacityType',
                            'allowsMixedProducts',
                            'physicalLengthUnit',
                            'physicalWidthUnit',
                            'physicalHeightUnit',
                            'storageCapacityUnit',
                          ].includes(field.field)
                            ? (VALUE_LABELS[value] ?? value)
                            : value}
                        </BulkImportFieldCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={fields.length + (imported ? 2 : 3)}
                    className="h-20 text-center"
                  >
                    Không có dòng phù hợp bộ lọc.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <OperationalPagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={(nextPage) => changeView({ page: nextPage })}
            onPageSizeChange={(size) => {
              changeView({ pageSize: size, page: 1 })
            }}
          />
        </OperationalListPanel>
      </TabsContent>
    </Tabs>
  )
}
