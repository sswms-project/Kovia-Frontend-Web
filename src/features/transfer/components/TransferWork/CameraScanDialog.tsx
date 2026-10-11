'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CAMERA_FAILURE_MESSAGES,
  startCameraScan,
  type CameraScanFailure,
} from '../../utils/camera-scan'

interface CameraScanDialogProps {
  readonly open: boolean
  readonly title: string
  readonly onOpenChange: (open: boolean) => void
  readonly onDecoded: (code: string) => void
}

export function CameraScanDialog({ open, title, onOpenChange, onDecoded }: CameraScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDecodedRef = useRef(onDecoded)
  const [failure, setFailure] = useState<CameraScanFailure | null>(null)

  useEffect(() => {
    onDecodedRef.current = onDecoded
  }, [onDecoded])

  useEffect(() => {
    if (!open) return
    let handle: { stop: () => void } | undefined
    let cancelled = false
    // Dialog mount video sau khi mở: chờ một nhịp để ref có giá trị.
    const timer = window.setTimeout(() => {
      const video = videoRef.current
      if (!video || cancelled) return
      void startCameraScan(
        video,
        (code) => {
          onDecodedRef.current(code)
          onOpenChange(false)
        },
        setFailure
      ).then((started) => {
        if (cancelled) started.stop()
        else handle = started
      })
    }, 50)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      handle?.stop()
    }
  }, [open, onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFailure(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Hướng camera vào mã vạch hoặc mã QR, giữ yên vài giây.
          </DialogDescription>
        </DialogHeader>
        {failure ? (
          <p role="alert" className="text-destructive text-sm">
            {CAMERA_FAILURE_MESSAGES[failure]}
          </p>
        ) : (
          <video
            ref={videoRef}
            className="bg-muted aspect-video w-full border object-cover"
            playsInline
            muted
            aria-label="Hình ảnh từ camera"
          />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
