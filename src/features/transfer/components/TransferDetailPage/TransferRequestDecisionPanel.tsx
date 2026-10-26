import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { TransferDetail } from '../../types/transfer.types'

interface TransferRequestDecisionPanelProps {
  readonly transfer: TransferDetail
  readonly canDecide: boolean
  readonly canWithdraw: boolean
  readonly disabled: boolean
  readonly uncertain: boolean
  readonly onAcceptAndPrepare: () => void
  readonly onAccept: () => void
  readonly onReject: () => void
  readonly onWithdraw: () => void
  readonly onVerify: () => void
}

export function TransferRequestDecisionPanel({
  transfer,
  canDecide,
  canWithdraw,
  disabled,
  uncertain,
  onAcceptAndPrepare,
  onAccept,
  onReject,
  onWithdraw,
  onVerify,
}: TransferRequestDecisionPanelProps) {
  if (uncertain)
    return (
      <Alert role="status" className="shrink-0">
        <AlertTitle>Cần đối chiếu kết quả thao tác</AlertTitle>
        <AlertDescription>
          Server có thể đã xử lý nhưng phản hồi bị mất. Tạm khóa quyết định khác để tránh gửi nhầm.
          <Button variant="outline" disabled={disabled} onClick={onVerify}>
            Kiểm tra thao tác trước
          </Button>
        </AlertDescription>
      </Alert>
    )
  if (transfer.status === 'Rejected')
    return (
      <Alert variant="destructive" className="shrink-0">
        <AlertTitle>Kho xuất đã từ chối yêu cầu</AlertTitle>
        <AlertDescription>
          {transfer.rejectionReason || 'Xem lịch sử xử lý của phiếu.'}
          {canWithdraw ? (
            <Button variant="outline" disabled={disabled} onClick={onWithdraw}>
              Thu hồi để sửa
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  if (transfer.status !== 'PendingSourceAcceptance')
    return canWithdraw ? (
      <Alert className="shrink-0">
        <AlertTitle>Yêu cầu chưa bắt đầu thực hiện</AlertTitle>
        <AlertDescription>
          Thu hồi để sửa sẽ hủy hiệu lực chấp nhận và nhả lượng hàng đang giữ của yêu cầu.
          <Button variant="outline" disabled={disabled} onClick={onWithdraw}>
            Thu hồi để sửa
          </Button>
        </AlertDescription>
      </Alert>
    ) : null
  return (
    <Alert className="shrink-0" role="status">
      <AlertTitle>
        {canDecide
          ? 'Yêu cầu đang chờ kho xuất xác nhận'
          : `Đang chờ ${transfer.sourceWarehouseName} xác nhận`}
      </AlertTitle>
      <AlertDescription>
        <p>
          Hàng hóa chưa được giữ chỗ. Khi chấp nhận, hệ thống kiểm tra lại tồn khả dụng và giữ chỗ
          toàn bộ yêu cầu.
        </p>
        <div className="flex flex-wrap gap-2">
          {canDecide ? (
            <>
              <Button disabled={disabled} onClick={onAcceptAndPrepare}>
                Chấp nhận & chuẩn bị xuất
              </Button>
              <Button variant="outline" disabled={disabled} onClick={onAccept}>
                Chỉ chấp nhận
              </Button>
              <Button variant="destructive" disabled={disabled} onClick={onReject}>
                Từ chối
              </Button>
            </>
          ) : null}
          {canWithdraw ? (
            <Button variant="outline" disabled={disabled} onClick={onWithdraw}>
              Thu hồi để sửa
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  )
}
