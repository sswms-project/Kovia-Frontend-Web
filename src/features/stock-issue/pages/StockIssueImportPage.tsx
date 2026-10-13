'use client'

import type { Route } from 'next'
import { useState } from 'react'
import { toast } from 'sonner'
import { BulkImportPendingBody } from '@/components/operations/BulkImportWorkspace'
import {
  BulkImportPage,
  type BulkImportColumn,
  type BulkImportCommitOutcome,
  type BulkImportInspectOutcome,
  type BulkImportPreviewOutcome,
} from '@/components/operations/BulkImportPage'
import type { SpreadsheetImportOptions } from '@/components/operations/spreadsheet-import.types'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  useImportStockIssueRequestsMutation,
  useInspectStockIssueImportMutation,
  useStockIssueImportPreviewMutation,
  useStockIssueImportTemplateMutation,
} from '../hooks/use-stock-issue-requests'
import type { StockIssueImportPreviewRow } from '../types/stock-issue.types'
import { formatStockIssueQuantity } from '../utils/stock-issue-format'
import { groupStockIssueImportRows, STOCK_ISSUE_IMPORT_MAX_ROWS } from '../utils/stock-issue-import'

const previewColumns: readonly BulkImportColumn<StockIssueImportPreviewRow>[] = [
  {
    key: 'recipientCode',
    header: 'Đơn vị nhận',
    cellClassName: 'max-w-64 min-w-40 wrap-anywhere whitespace-normal',
    render: (row) =>
      row.recipientName
        ? `${row.recipientCode} · ${row.recipientName}`
        : (row.recipientCode ?? '—'),
  },
  {
    key: 'referenceCode',
    header: 'Tham chiếu',
    headClassName: 'w-32',
    cellClassName: 'max-w-40 min-w-28 font-mono wrap-anywhere whitespace-normal',
    render: (row) => row.referenceCode ?? '—',
  },
  {
    key: 'sku',
    header: 'Sản phẩm',
    cellClassName: 'max-w-64 min-w-40 wrap-anywhere whitespace-normal',
    render: (row) => (row.productName ? `${row.sku} · ${row.productName}` : (row.sku ?? '—')),
  },
  {
    key: 'quantity',
    header: 'Số lượng',
    headClassName: 'w-32 text-right',
    cellClassName: 'text-right tabular-nums',
    render: (row) =>
      row.quantity === null
        ? '—'
        : `${formatStockIssueQuantity(row.quantity)}${row.unitName ? ` ${row.unitName}` : ''}`,
  },
  {
    key: 'availableQuantity',
    header: 'Tồn khả dụng (đơn vị cơ sở)',
    headClassName: 'w-36 text-right',
    cellClassName: 'text-right tabular-nums',
    render: (row) =>
      row.availableQuantity === null ? '—' : formatStockIssueQuantity(row.availableQuantity),
  },
  {
    key: 'warnings',
    header: 'Cảnh báo',
    cellClassName: 'text-warning max-w-72 min-w-40 wrap-anywhere whitespace-normal text-xs',
    render: (row) => row.warnings?.join(' ') || '—',
  },
  {
    key: 'purpose',
    header: 'Diễn giải',
    isSupplementary: true,
    cellClassName: 'max-w-64 min-w-40 wrap-anywhere whitespace-normal',
    render: (row) => row.purpose ?? '—',
  },
]

function getRowLabel(row: StockIssueImportPreviewRow) {
  return `${row.sku ?? 'Dòng'} · ${row.recipientCode ?? ''}`.trim()
}

function getRowSearchText(row: StockIssueImportPreviewRow) {
  return [
    row.recipientCode,
    row.recipientName,
    row.referenceCode,
    row.sku,
    row.productName,
    row.purpose,
    ...row.errors,
  ]
    .filter(Boolean)
    .join(' ')
}

export default function StockIssueImportPage() {
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouseRevision, setWarehouseRevision] = useState(0)
  const importMutation = useImportStockIssueRequestsMutation()
  const previewMutation = useStockIssueImportPreviewMutation()
  const inspectMutation = useInspectStockIssueImportMutation()
  const templateMutation = useStockIssueImportTemplateMutation()
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })

  async function handlePreview(
    file: File,
    options: SpreadsheetImportOptions
  ): Promise<BulkImportPreviewOutcome<StockIssueImportPreviewRow>> {
    try {
      const response = await previewMutation.mutateAsync({ warehouseId, file, options })
      return { isSucceeded: true, rows: response.data.rows }
    } catch (error) {
      return {
        isSucceeded: false,
        message: getApiErrorMessage(error, 'Không thể đọc tệp nhập. Vui lòng thử lại.'),
      }
    }
  }

  async function handleInspect(
    file: File,
    csvDelimiter: string
  ): Promise<BulkImportInspectOutcome> {
    if (!warehouseId)
      return { isSucceeded: false, message: 'Hãy chọn kho xuất hàng trước khi chọn tệp.' }
    try {
      const response = await inspectMutation.mutateAsync({ file, csvDelimiter })
      return { isSucceeded: true, inspection: response.data }
    } catch (error) {
      return {
        isSucceeded: false,
        message: getApiErrorMessage(error, 'Không thể đọc cấu trúc tệp. Vui lòng thử lại.'),
      }
    }
  }

  async function handleDownloadTemplate() {
    try {
      await templateMutation.mutateAsync()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp mẫu. Vui lòng thử lại.'))
    }
  }

  async function handleImport(
    rows: readonly StockIssueImportPreviewRow[]
  ): Promise<BulkImportCommitOutcome> {
    const requests = groupStockIssueImportRows(rows)
    try {
      await importMutation.mutateAsync({ warehouseId, requests })
      toast.success(`Đã tạo ${requests.length} phiếu xuất kho. Phiếu chờ xử lý vẫn chỉnh sửa được.`)
      return { isSucceeded: true }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo phiếu xuất kho. Vui lòng thử lại.')
      toast.error(message)
      return {
        isSucceeded: false,
        message,
        requiresReconciliation: !isApiErrorResponse(error) || error.statusCode >= 500,
      }
    }
  }

  if (me.isPending) return <BulkImportPendingBody />

  if (!permissions.includes(P.STOCK_ISSUE_REQUESTS_CREATE)) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Bạn không có quyền nhập phiếu xuất kho từ tệp.
      </p>
    )
  }

  return (
    <BulkImportPage
      key={`${me.data?.tenantId}:${me.data?.id}`}
      // Đổi kho sau khi đã kiểm tra tệp làm kết quả cũ hết hiệu lực nên buộc kiểm tra lại.
      validationRevision={warehouseRevision}
      eyebrow="Xuất kho"
      title="Nhập phiếu xuất kho từ tệp"
      entityLabel="phiếu xuất kho"
      maxRows={STOCK_ISSUE_IMPORT_MAX_ROWS}
      backHref={APP_ROUTES.stockIssueRequests as Route}
      backLabel="Quay lại danh sách phiếu xuất kho"
      listLabel="Xem danh sách phiếu xuất kho"
      resultFileName="kovia-ket-qua-nhap-phieu-xuat-kho.csv"
      columns={previewColumns}
      getRowLabel={getRowLabel}
      getRowSearchText={getRowSearchText}
      isPreviewing={previewMutation.isPending || inspectMutation.isPending}
      isImporting={importMutation.isPending}
      isDownloadingTemplate={templateMutation.isPending}
      beforeFile={
        <Field>
          <FieldLabel htmlFor="stock-issue-import-warehouse">Kho xuất hàng</FieldLabel>
          <NativeSelect
            id="stock-issue-import-warehouse"
            className="w-full max-w-md"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value)
              setWarehouseRevision((revision) => revision + 1)
            }}
          >
            <NativeSelectOption value="">Chọn kho trước khi chọn tệp…</NativeSelectOption>
            {(warehousesQuery.data?.items ?? []).map((warehouse) => (
              <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                {warehouse.warehouseCode} · {warehouse.warehouseName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Mỗi tệp chỉ xuất từ một kho vì nhân viên lấy hàng được giao theo kho của phiếu. Sản phẩm
            không còn tồn khả dụng tại kho này sẽ báo lỗi.
          </FieldDescription>
        </Field>
      }
      onDownloadTemplate={handleDownloadTemplate}
      onPreview={handlePreview}
      onInspect={handleInspect}
      onImport={handleImport}
    />
  )
}
