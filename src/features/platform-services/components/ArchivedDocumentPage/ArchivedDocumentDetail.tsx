import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ReturnDocumentFrame,
  ReturnDetailField,
  ReturnDocumentHistory,
  returnHistoryEvents,
} from '@/components/operations/ReturnDocumentFrame'
import { APP_ROUTES } from '@/routes/app-routes'
import { formatInventoryQuantity } from '@/features/inventory/utils/inventory-format'
import {
  ARCHIVED_DOCUMENT_LABELS,
  type ArchivedDocument,
} from '../../types/archived-document.types'
import { formatPlatformDateTime } from '../../utils/platform-services-format'

export function ArchivedDocumentDetail({ document }: { readonly document: ArchivedDocument }) {
  const quality = (value: string) =>
    (
      ({
        Good: 'Tốt',
        Damaged: 'Hư hỏng',
        Quarantine: 'Cách ly',
        Expired: 'Hết hạn',
        Scrap: 'Hủy bỏ',
      }) as Record<string, string>
    )[value] ?? value
  const quantity = (line: ArchivedDocument['items'][number]) =>
    `${formatInventoryQuantity(line.enteredQuantity ?? line.quantity)} ${line.enteredUnitName ?? line.unitName}`
  const fieldValue = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatPlatformDateTime(value) : value
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-3">
      <ReturnDocumentFrame
        title={ARCHIVED_DOCUMENT_LABELS[document.documentType]}
        code={document.code}
        subtitle={document.warehouseName}
        listHref={APP_ROUTES.auditLogs}
        backLabel="Quay lại nhật ký hoạt động"
        status={<Badge variant="secondary">Đã xóa nháp · Chỉ xem</Badge>}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
        info={
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReturnDetailField label="Kho">{document.warehouseName}</ReturnDetailField>
            <ReturnDetailField label="Người lập">{document.createdByName}</ReturnDetailField>
            <ReturnDetailField label="Ngày lập">
              {formatPlatformDateTime(document.createdAt)}
            </ReturnDetailField>
            <ReturnDetailField label="Đã xóa lúc">
              {document.deletedAt ? formatPlatformDateTime(document.deletedAt) : 'Chưa ghi nhận'}
            </ReturnDetailField>
            {document.fields.map((field) => (
              <ReturnDetailField key={field.label} label={field.label}>
                {fieldValue(field.value)}
              </ReturnDetailField>
            ))}
          </dl>
        }
      >
        <section className="bg-card border" aria-label="Hàng hóa của phiếu đã xóa">
          <h2 className="border-b px-4 py-3 font-semibold">Chi tiết hàng hóa</h2>
          <p className="text-muted-foreground px-4 py-3 text-sm">
            Nội dung phiếu được giữ lại; tên hàng, đơn vị và vị trí tra theo danh mục hiện tại.
            Phiếu này không còn hiệu lực xử lý.
          </p>
          <div className="divide-y md:hidden">
            {document.items.map((line, index) => (
              <article
                key={`${line.productId}-${index}`}
                className="flex min-w-0 flex-col gap-2 p-4 wrap-anywhere"
              >
                <p className="font-medium">{line.productName}</p>
                <p className="font-mono text-sm">{line.sku}</p>
                <p>
                  {quantity(line)}
                  {line.enteredQuantity !== null
                    ? ` · ${formatInventoryQuantity(line.quantity)} ${line.unitName}`
                    : ''}
                </p>
                <p className="text-sm">
                  {line.location ?? 'Không có vị trí'} · {line.lotNumber ?? 'Không theo lô'}
                </p>
                {line.quality ? <p className="text-sm">{quality(line.quality)}</p> : null}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Vật tư hàng hóa</TableHead>
                  <TableHead>Số lượng yêu cầu</TableHead>
                  <TableHead>Số lượng (ĐVT)</TableHead>
                  <TableHead>Vị trí · Lô</TableHead>
                  <TableHead>Tình trạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.items.map((line, index) => (
                  <TableRow key={`${line.productId}-${index}`}>
                    <TableCell className="max-w-80 wrap-anywhere whitespace-normal">
                      <p>{line.productName}</p>
                      <p className="font-mono text-xs">{line.sku}</p>
                    </TableCell>
                    <TableCell>{quantity(line)}</TableCell>
                    <TableCell>
                      {formatInventoryQuantity(line.quantity)} {line.unitName}
                    </TableCell>
                    <TableCell className="max-w-72 wrap-anywhere whitespace-normal">
                      {line.location ?? '—'}
                      <p className="text-muted-foreground text-xs">
                        {line.lotNumber ?? 'Không theo lô'}
                      </p>
                    </TableCell>
                    <TableCell>{line.quality ? quality(line.quality) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <ReturnDocumentHistory events={returnHistoryEvents(document.history)} />
      </ReturnDocumentFrame>
    </div>
  )
}
