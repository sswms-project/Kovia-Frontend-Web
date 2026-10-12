export interface CameraScanHandle {
  readonly stop: () => void
}

export type CameraScanFailure = 'insecure' | 'denied' | 'no-camera' | 'unknown'

/** Camera chỉ dùng được trên HTTPS hoặc localhost và khi thiết bị có camera. */
export function isCameraScanSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

export function describeCameraFailure(error: unknown): CameraScanFailure {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure'
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-camera'
  return 'unknown'
}

export const CAMERA_FAILURE_MESSAGES: Record<CameraScanFailure, string> = {
  insecure: 'Camera chỉ hoạt động khi mở trang bằng HTTPS.',
  denied: 'Bạn chưa cho phép dùng camera. Hãy cấp quyền camera cho trang này rồi thử lại.',
  'no-camera': 'Không tìm thấy camera trên thiết bị này.',
  unknown: 'Không mở được camera. Hãy thử lại hoặc nhập mã bằng tay.',
}

interface CameraScanOptions {
  /** Đọc liên tục thay vì dừng sau mã đầu tiên; cùng một mã chỉ báo lại sau {@link REPEAT_GUARD_MS}. */
  readonly continuous?: boolean
  /** Khoảng bỏ qua mã trùng khi đọc liên tục; mặc định {@link REPEAT_GUARD_MS}. */
  readonly repeatGuardMs?: number
}

/** Giữ camera trước một mã thì ZXing đọc lại nhiều lần mỗi giây; bỏ qua mã trùng trong khoảng này. */
export const REPEAT_GUARD_MS = 1500

/**
 * Bật camera sau và đọc mã vạch/QR. Mặc định dừng sau mã đầu tiên (hộp thoại camera riêng); chế độ liên tục
 * giữ camera chạy để quét nhiều mã liên tiếp. Thư viện giải mã chỉ tải khi người dùng bật camera nên không làm
 * nặng màn hình lấy/nhận hàng.
 */
export async function startCameraScan(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  onError: (failure: CameraScanFailure) => void,
  { continuous = false, repeatGuardMs = REPEAT_GUARD_MS }: CameraScanOptions = {}
): Promise<CameraScanHandle> {
  let stopped = false
  let controls: { stop: () => void } | undefined
  let lastCode = ''
  let lastSeenAt = 0
  const stop = () => {
    stopped = true
    controls?.stop()
  }
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      video,
      (result) => {
        if (stopped || !result) return
        const code = result.getText().trim()
        if (!continuous) {
          stopped = true
          controls?.stop()
          onCode(code)
          return
        }
        const now = Date.now()
        const isRepeat = code === lastCode && now - lastSeenAt < repeatGuardMs
        // Còn thấy mã đó trước camera thì gia hạn, chỉ báo lại khi đã rời mã đủ lâu.
        lastCode = code
        lastSeenAt = now
        if (!isRepeat) onCode(code)
      }
    )
    if (stopped) controls.stop()
  } catch (error) {
    if (!stopped) onError(describeCameraFailure(error))
  }
  return { stop }
}
