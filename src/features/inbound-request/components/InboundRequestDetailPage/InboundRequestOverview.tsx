import { Progress } from '@/components/ui/progress'
import { OperationalDocumentInfo } from '@/components/operations/OperationalDocumentInfo'
import type { InboundRequestDetail } from '../../types/inbound-request.types'
import {
  formatOperationalDate,
  formatOperationalDateTime,
  formatQuantity,
} from '../../utils/inbound-request-format'
import { inboundSourceLabels } from '../../schemas/inbound-request.schema'

export function InboundRequestOverview({ request }: { readonly request: InboundRequestDetail }) {
  const orderedQuantity = request.lines.reduce((sum, line) => sum + line.quantity, 0)
  const receivedQuantity = request.lines.reduce((sum, line) => sum + line.receivedQuantity, 0)
  const progress =
    orderedQuantity <= 0 ? 0 : Math.min(100, (receivedQuantity / orderedQuantity) * 100)

  return (
    <OperationalDocumentInfo
      documentId={request.id}
      headingId="inbound-request-overview"
      summary={`${request.supplierName ?? request.sourceName ?? 'Chưa xác định nguồn hàng'} → ${request.warehouseName ?? 'Chưa xác định kho'}`}
      summaryContent={
        <>
          <dl className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <dt className="text-muted-foreground text-xs">Tiến độ nhận</dt>
              <dd className="text-xs font-medium tabular-nums">
                {formatQuantity(receivedQuantity)} / {formatQuantity(orderedQuantity)}
              </dd>
            </div>
            <Progress value={progress} />
          </dl>
          {request.rejectionReason ? (
            <div className="mt-3 border-t pt-3">
              <p className="text-destructive text-xs font-medium">Yêu cầu chỉnh sửa</p>
              <p className="mt-1 text-xs break-words">{request.rejectionReason}</p>
            </div>
          ) : null}
        </>
      }
    >
      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metadata label="Loại nguồn" value={inboundSourceLabels[request.sourceType]} />
        <Metadata
          label="Nguồn hàng"
          value={request.supplierName ?? request.sourceName ?? 'Chưa xác định'}
        />
        <Metadata label="Kho nhận" value={request.warehouseName ?? 'Chưa xác định'} />
        <Metadata
          label="Nhân viên nhận và cất hàng"
          value={request.receivingAssignedToName ?? 'Chưa phân công'}
        />
        <Metadata label="Ngày dự kiến" value={formatOperationalDate(request.expectedDate)} />
        <Metadata
          label="Người tạo"
          value={`${request.createdByName} · ${formatOperationalDateTime(request.createdAt)}`}
        />
        {request.submittedAt ? (
          <Metadata label="Ngày gửi duyệt" value={formatOperationalDateTime(request.submittedAt)} />
        ) : null}
        {request.approvedByName ? (
          <Metadata
            label="Người duyệt"
            value={`${request.approvedByName}${request.approvedAt ? ` · ${formatOperationalDateTime(request.approvedAt)}` : ''}`}
          />
        ) : null}
        {request.modifiedAt ? (
          <Metadata
            label="Cập nhật lần cuối"
            value={formatOperationalDateTime(request.modifiedAt)}
          />
        ) : null}
        {request.supplierId ? (
          <Metadata label="Email nhà cung cấp" value={request.supplierEmail ?? 'Chưa có email'} />
        ) : null}
        {request.supplierEmailSentAt ? (
          <Metadata
            label="Đã gửi mail đơn hàng"
            value={`${request.supplierEmailSentTo ?? ''} · ${formatOperationalDateTime(request.supplierEmailSentAt)}${request.supplierEmailSentByName ? ` · ${request.supplierEmailSentByName}` : ''}`}
          />
        ) : null}
        {request.sourceReference ? (
          <Metadata label="Mã tham chiếu" value={request.sourceReference} />
        ) : null}
      </dl>
    </OperationalDocumentInfo>
  )
}

function Metadata({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
