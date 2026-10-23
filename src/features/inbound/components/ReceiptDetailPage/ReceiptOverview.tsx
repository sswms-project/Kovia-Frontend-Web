import { formatOperationalDate } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptDetail } from '../../types/inbound.types'

interface ReceiptOverviewProps {
  readonly receipt: GoodsReceiptDetail
}

export function ReceiptOverview({ receipt }: ReceiptOverviewProps) {
  return (
    <section className="bg-card shrink-0 border" aria-labelledby="receipt-overview-heading">
      <div className="border-b p-4">
        <h2 id="receipt-overview-heading" className="text-sm font-semibold">
          Tổng quan phiếu nhận hàng
        </h2>
      </div>
      <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {receipt.keptAtReceiving && (
          <Metadata
            label="Hướng xử lý hàng đạt"
            value="Giữ tại vị trí nhận · khả dụng theo FEFO, chưa phải đã cất kệ"
          />
        )}
        <Metadata label="Yêu cầu nhập kho" value={receipt.inboundRequestCode} />
        <Metadata label="Kho nhận" value={receipt.warehouseName} />
        <Metadata
          label="Người ghi nhận"
          value={receipt.receivingAssignedToName ?? receipt.createdByName}
        />
        <Metadata label="Ngày tạo" value={formatOperationalDate(receipt.createdAt)} />
        {!receipt.keptAtReceiving &&
        (receipt.status === 'Approved' || receipt.status === 'Completed') ? (
          <Metadata label="Người cất hàng" value={receipt.putAwayAssignedToName ?? 'Chưa giao'} />
        ) : null}
        {receipt.approvedByName ? (
          <Metadata label="Người duyệt" value={receipt.approvedByName} />
        ) : null}
      </dl>
      <div className="space-y-2 border-t p-4 text-sm">
        <p>
          {receipt.status === 'Approved'
            ? 'Đã duyệt kết quả kiểm; phần đạt còn chờ cất, phần hỏng đã nhập cần được cách biệt.'
            : receipt.status === 'Completed' &&
                receipt.receivingFlowVersion === 1 &&
                receipt.items.every((item) => item.receivedQuantity === 0)
              ? 'Đã duyệt biên bản từ chối toàn bộ. Không ghi tồn hoặc tạo việc cất; phần chưa nhận vẫn theo dõi trên yêu cầu nhập.'
              : receipt.receivingFlowVersion === 1
                ? 'Kiểm trước nhận: chỉ phần chấp nhận vào tồn. Phần từ chối không làm tăng tồn hoặc tự đóng lượng còn phải nhận.'
                : 'Phiếu lịch sử giữ nguyên cách ghi nhận trước chuyển đổi.'}
        </p>
        {receipt.refusalEvidence?.map((file) => (
          <p key={file.id}>Bằng chứng từ chối: {file.fileName}</p>
        ))}
      </div>
      {receipt.rejectionReason ? (
        <div className="border-t p-4">
          <p className="text-destructive text-xs font-medium">Yêu cầu chỉnh sửa</p>
          <p className="mt-1 text-xs">{receipt.rejectionReason}</p>
        </div>
      ) : null}
    </section>
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
