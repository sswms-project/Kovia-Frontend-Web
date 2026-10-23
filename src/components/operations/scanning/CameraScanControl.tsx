'use client'

import { Camera, CameraOff } from 'lucide-react'
import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isCameraScanSupported } from '@/lib/camera-scan'
import { useCameraScanStore } from '@/stores/camera-scan.store'
import { InlineCameraScanner } from './InlineCameraScanner'

interface CameraScanControlProps {
  readonly label: string
  readonly disabled: boolean
  readonly pausedMessage?: string
  readonly mode?: 'single' | 'continuous'
  /** Business validation stays with the input; a rejected scan must not close the camera. */
  readonly onCode: (code: string) => boolean
}

const subscribeNothing = () => () => undefined
const serverAvailability = () => 'pending' as const
function cameraAvailability() {
  if (isCameraScanSupported()) return 'supported'
  return window.isSecureContext ? 'unsupported' : 'insecure'
}

export function CameraScanControl({
  label,
  disabled,
  pausedMessage,
  mode = 'continuous',
  onCode,
}: CameraScanControlProps) {
  const id = useId()
  const open = useCameraScanStore((state) => state.activeId === id)
  const stopped = useRef(false)
  const availability = useSyncExternalStore(
    subscribeNothing,
    cameraAvailability,
    serverAvailability
  )
  const active = open && !disabled && !pausedMessage && availability === 'supported'

  useEffect(() => {
    if (disabled || pausedMessage) useCameraScanStore.getState().close(id)
  }, [disabled, pausedMessage, id])

  useEffect(() => {
    const closeWhenHidden = () => {
      if (document.hidden) useCameraScanStore.getState().close(id)
    }
    document.addEventListener('visibilitychange', closeWhenHidden)
    return () => {
      useCameraScanStore.getState().close(id)
      document.removeEventListener('visibilitychange', closeWhenHidden)
    }
  }, [id])

  const unavailable =
    availability === 'insecure'
      ? 'Camera cần HTTPS hoặc localhost. Nếu dùng điện thoại qua IP nội bộ, hãy mở địa chỉ HTTPS.'
      : availability === 'unsupported'
        ? 'Trình duyệt không hỗ trợ camera. Bạn vẫn có thể nhập mã hoặc dùng máy quét cầm tay.'
        : null

  return (
    <section aria-label={`Camera: ${label}`} className="flex min-w-0 flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full touch-manipulation sm:w-auto sm:self-start"
        aria-label={`${open ? 'Tắt' : 'Bật'} camera: ${label}`}
        aria-expanded={active}
        aria-controls={`${id}-camera`}
        disabled={!open && (disabled || Boolean(pausedMessage) || availability !== 'supported')}
        onClick={() => {
          stopped.current = false
          const session = useCameraScanStore.getState()
          if (open) session.close(id)
          else session.open(id)
        }}
      >
        {open ? (
          <CameraOff aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Camera aria-hidden="true" data-icon="inline-start" />
        )}
        {open ? 'Tắt camera' : 'Quét bằng camera'}
      </Button>
      <div id={`${id}-camera`}>
        {active ? (
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <InlineCameraScanner
              active
              onCode={(code) => {
                if (
                  disabled ||
                  pausedMessage ||
                  stopped.current ||
                  useCameraScanStore.getState().activeId !== id
                )
                  return
                const accepted = onCode(code)
                if (accepted && mode === 'single') {
                  stopped.current = true
                  useCameraScanStore.getState().close(id)
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Hướng mã vào giữa khung. Đưa mã ra khỏi khung trước khi quét lại cùng mã. Camera chỉ
              đọc mã, không chụp hoặc lưu ảnh.
            </p>
          </div>
        ) : null}
      </div>
      {unavailable ? (
        <Alert role="status">
          <AlertDescription>{unavailable}</AlertDescription>
        </Alert>
      ) : pausedMessage ? (
        <p role="status" className="text-muted-foreground text-xs">
          {pausedMessage}
        </p>
      ) : null}
    </section>
  )
}
