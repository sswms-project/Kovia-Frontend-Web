'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
  const [attempt, setAttempt] = useState(0)
  const [playing, setPlaying] = useState(false)

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
      if (cancelled) return
      setFailure(null)
      setPlaying(false)
      void startCameraScan(
        video,
        (code) => {
          if (!cancelled) onCodeRef.current(code)
        },
        (error) => {
          if (!cancelled) setFailure(error)
        },
        {
          continuous: true,
          repeatGuardMs,
        }
      ).then((started) => {
        if (cancelled) started.stop()
        else handle = started
      })
    })
    return () => {
      cancelled = true
      handle?.stop()
    }
  }, [active, repeatGuardMs, attempt])

  if (!active) return null
  return (
    <div className="bg-muted relative aspect-video min-h-40 w-full border">
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        hidden={Boolean(failure)}
        playsInline
        muted
        onPlaying={() => setPlaying(true)}
        aria-label="Hình ảnh từ camera"
      />
      {failure ? (
        <div className="relative flex min-h-40 flex-col justify-center gap-3 p-3">
          <Alert variant="destructive">
            <AlertDescription>{CAMERA_FAILURE_MESSAGES[failure]}</AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Thử lại camera
          </Button>
        </div>
      ) : !playing ? (
        <div
          className="bg-muted absolute inset-0 flex items-center justify-center gap-2 p-3 text-sm"
          role="status"
        >
          <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
          Đang mở camera… Hãy cấp quyền nếu được hỏi.
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="border-primary-container pointer-events-none absolute inset-6 border-2"
        />
      )}
    </div>
  )
}
