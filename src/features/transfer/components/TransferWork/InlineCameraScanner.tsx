'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CAMERA_FAILURE_MESSAGES,
  startCameraScan,
  type CameraScanFailure,
} from '../../utils/camera-scan'

interface InlineCameraScannerProps {
  /** Bật/tắt camera; tắt thì giải phóng camera hoàn toàn. */
  readonly active: boolean
  /** Gọi cho mỗi mã đọc được (đã chống đọc trùng khi giữ yên trước một mã). */
  readonly onCode: (code: string) => void
  /** Quét từng đơn vị: thùng giống nhau nối tiếp nhau nên chỉ chặn đọc trùng trong khoảng ngắn. */
  readonly repeatGuardMs?: number
}

/**
 * Khung camera nằm trong hộp thoại và chạy liên tục qua nhiều bước quét, thay cho hộp thoại camera mở lại
 * sau mỗi mã. Nhỏ gọn để không che các ô bên dưới trên điện thoại.
 */
export function InlineCameraScanner({ active, onCode, repeatGuardMs }: InlineCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  const [failure, setFailure] = useState<CameraScanFailure | null>(null)

  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let handle: { stop: () => void } | undefined
    queueMicrotask(() => {
      if (!cancelled) setFailure(null)
    })
    void startCameraScan(video, (code) => onCodeRef.current(code), setFailure, {
      continuous: true,
      repeatGuardMs,
    }).then((started) => {
      if (cancelled) started.stop()
      else handle = started
    })
    return () => {
      cancelled = true
      handle?.stop()
    }
  }, [active, repeatGuardMs])

  if (!active) return null
  return failure ? (
    <p role="alert" className="text-destructive text-sm">
      {CAMERA_FAILURE_MESSAGES[failure]}
    </p>
  ) : (
    <video
      ref={videoRef}
      className="bg-muted h-40 w-full border object-cover"
      playsInline
      muted
      aria-label="Hình ảnh từ camera"
    />
  )
}
