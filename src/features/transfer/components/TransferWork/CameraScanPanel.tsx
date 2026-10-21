'use client'

import { Camera, CameraOff, ScanQrCode } from 'lucide-react'
import { useId, useRef, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { logger } from '@/lib/logger'
import { CAMERA_FAILURE_MESSAGES, isCameraScanSupported } from '../../utils/camera-scan'
import { playScanFeedback } from '../../utils/scan-feedback'
import { useScanPreferences } from '../../utils/scan-preferences'
import { InlineCameraScanner } from './InlineCameraScanner'
import type { ScanResult } from './ScanInput'

interface CameraScanPanelProps {
  readonly label: string
  readonly open: boolean
  readonly disabled?: boolean
  readonly pausedMessage?: string
  readonly repeatGuardMs?: number
  readonly onOpenChange: (open: boolean) => void
  readonly onCode: (code: string) => ScanResult
}

const subscribeNothing = () => () => undefined
const serverAvailability = () => 'pending' as const
function cameraAvailability() {
  if (isCameraScanSupported()) return 'supported'
  return window.isSecureContext ? 'unsupported' : 'insecure'
}

/** Shared transfer scan surface; permission is requested only after the user presses Start. */
export function CameraScanPanel({
  label,
  open,
  disabled = false,
  pausedMessage,
  repeatGuardMs,
  onOpenChange,
  onCode,
}: CameraScanPanelProps) {
  const availability = useSyncExternalStore(
    subscribeNothing,
    cameraAvailability,
    serverAvailability
  )
  const [preferences] = useScanPreferences()
  const reading = useRef(false)
  const frameId = useId()
  const supported = availability === 'supported'
  const active = open && supported && !disabled && !pausedMessage
  const unavailable =
    availability === 'insecure'
      ? `${CAMERA_FAILURE_MESSAGES.insecure} Nếu mở bằng địa chỉ IP nội bộ trên điện thoại, hãy dùng địa chỉ HTTPS.`
      : availability === 'unsupported'
        ? 'Trình duyệt này không hỗ trợ truy cập camera. Hãy dùng trình duyệt hỗ trợ camera hoặc nhập mã bên dưới.'
        : null

  async function decode(code: string) {
    if (!active || reading.current) return
    reading.current = true
    try {
      const result = await onCode(code)
      if (preferences.feedback && typeof result === 'boolean') {
        playScanFeedback(result ? 'success' : 'error')
      }
    } catch (error) {
      logger.error(error)
      toast.error('Không kiểm tra được mã. Hãy thử lại hoặc nhập mã bên dưới.')
    } finally {
      reading.current = false
    }
  }

  return (
    <section
      aria-label={`Camera: ${label}`}
      className="flex w-full min-w-0 flex-col gap-3 md:max-w-md"
    >
      <p className="text-sm font-medium">{label}</p>
      <div id={frameId}>
        {active ? (
          <InlineCameraScanner
            active
            onCode={(code) => void decode(code)}
            repeatGuardMs={repeatGuardMs}
          />
        ) : (
          <Empty className="bg-muted aspect-video min-h-40 border p-3">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScanQrCode aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{open ? 'Camera tạm dừng' : 'Khung quét mã QR / mã vạch'}</EmptyTitle>
              <EmptyDescription role="status">
                {(unavailable ? 'Bạn vẫn có thể nhập mã hoặc dùng máy quét ngoài.' : null) ??
                  (disabled
                    ? 'Biểu mẫu đang bị khóa thao tác. Camera tạm dừng để tránh quét nhầm.'
                    : pausedMessage) ??
                  'Bấm Bật camera quét, cấp quyền rồi hướng mã vào giữa khung hình.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      {unavailable ? (
        <Alert role="status" aria-label="Trạng thái camera">
          <AlertDescription>
            {unavailable} Bạn vẫn có thể nhập mã hoặc dùng máy quét ngoài.
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant={open ? 'outline' : 'default'}
        className="h-11 w-full touch-manipulation"
        aria-label={`${open ? 'Tắt' : 'Bật'} camera quét: ${label}`}
        aria-pressed={open}
        aria-controls={frameId}
        disabled={!open && (!supported || disabled || Boolean(pausedMessage))}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {open ? 'Tắt camera quét' : 'Bật camera quét'}
      </Button>
      <p className="text-muted-foreground text-xs">
        Camera chỉ đọc mã; không chụp hoặc lưu ảnh hàng hóa. Có thể nhập mã thủ công ở bên dưới.
      </p>
    </section>
  )
}
