import { Progress } from '@/components/ui/progress'
import type {
  InboundRequestDetail,
  SupplierResponseDecision,
} from '../../types/inbound-request.types'
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
    <>
      <section className="bg-card border" aria-labelledby="inbound-request-overview">
        <div className="border-b p-4">
          <h2 id="inbound-request-overview" className="text-sm font-semibold">
            Tổng quan
          </h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-4 lg:grid-cols-4">
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
            <Metadata
              label="Ngày gửi duyệt"
              value={formatOperationalDateTime(request.submittedAt)}
            />
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
          {request.supplierEmailSentAt ? (
            <Metadata label="Phản hồi nhà cung cấp" value={getSupplierResponseSummary(request)} />
          ) : null}
          {request.sourceReference ? (
            <Metadata label="Mã tham chiếu" value={request.sourceReference} />
          ) : null}
          <div className="col-span-2 lg:col-span-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <dt className="text-muted-foreground text-xs">Tiến độ nhận</dt>
              <dd className="text-xs font-medium tabular-nums">
                {formatQuantity(receivedQuantity)} / {formatQuantity(orderedQuantity)}
              </dd>
            </div>
            <Progress value={progress} />
          </div>
        </dl>
        <SupplierResponseNotice request={request} />
        {request.rejectionReason ? (
          <div className="border-t px-4 py-3">
            <p className="text-destructive text-xs font-medium">Yêu cầu chỉnh sửa</p>
            <p className="mt-1 text-xs">{request.rejectionReason}</p>
          </div>
        ) : null}
      </section>
    </>
  )
}

const SUPPLIER_RESPONSE_LABELS: Record<SupplierResponseDecision, string> = {
  Confirmed: 'Đã xác nhận',
  Rejected: 'Đã từ chối',
  ProposedNewDate: 'Đề xuất ngày giao khác',
}

function getSupplierResponseSummary(request: InboundRequestDetail) {
  if (!request.supplierResponse) return 'Chưa phản hồi'
  const label =
    request.supplierResponse === 'Confirmed' && request.supplierProposalAcceptedAt
      ? 'Đã xác nhận theo ngày đề xuất'
      : SUPPLIER_RESPONSE_LABELS[request.supplierResponse]
  return request.supplierRespondedAt
    ? `${label} · ${formatOperationalDateTime(request.supplierRespondedAt)}`
    : label
}

function SupplierResponseNotice({ request }: { readonly request: InboundRequestDetail }) {
  if (request.supplierResponse === 'Rejected')
    return (
      <div className="border-t px-4 py-3" role="note">
        <p className="text-destructive text-xs font-medium">Nhà cung cấp từ chối đơn</p>
        <p className="mt-1 text-xs">{request.supplierResponseNote}</p>
      </div>
    )
  if (request.supplierResponse === 'ProposedNewDate')
    return (
      <div className="border-t px-4 py-3" role="note">
        <p className="text-xs font-medium">
          Nhà cung cấp đề xuất giao ngày {formatOperationalDate(request.supplierProposedDate)}
        </p>
        {request.supplierResponseNote ? (
          <p className="text-muted-foreground mt-1 text-xs">{request.supplierResponseNote}</p>
        ) : null}
      </div>
    )
  if (request.supplierResponse === 'Confirmed' && request.supplierResponseNote)
    return (
      <div className="border-t px-4 py-3" role="note">
        <p className="text-xs font-medium">Ghi chú của nhà cung cấp</p>
        <p className="text-muted-foreground mt-1 text-xs">{request.supplierResponseNote}</p>
      </div>
    )
  return null
}

function Metadata({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}
