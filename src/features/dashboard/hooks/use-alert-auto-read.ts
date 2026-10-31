'use client'

import { useEffect, useRef } from 'react'
import { speak } from '@/lib/speech'
import { buildAlertSpeech, hasUrgentAlerts, type AlertSpeechCounts } from '../utils/alert-speech'

interface AutoReadOptions {
  readonly enabled: boolean
  readonly available: boolean
  /** Khóa phạm vi (kho + số ngày) để mỗi phạm vi chỉ đọc một lần mỗi phiên. */
  readonly scopeKey: string
  readonly counts: AlertSpeechCounts | undefined
  readonly warehouseName?: string
}

// Phạm vi đã đọc trong phiên trình duyệt hiện tại, tránh đọc lại khi dữ liệu tải lại.
const announced = new Set<string>()

/** Chỉ dùng trong test. */
export function resetAnnouncedAlerts() {
  announced.clear()
}

/**
 * Tự đọc cảnh báo khẩn khi bật. Trình duyệt chặn âm thanh trước khi người dùng thao tác,
 * nên nếu chưa có thao tác nào thì chờ lần chạm/bấm phím đầu tiên rồi mới đọc.
 */
export function useAlertAutoRead({
  enabled,
  available,
  scopeKey,
  counts,
  warehouseName,
}: AutoReadOptions) {
  const latest = useRef({ counts, warehouseName })
  useEffect(() => {
    latest.current = { counts, warehouseName }
  })
  const ready = Boolean(counts && hasUrgentAlerts(counts))

  useEffect(() => {
    if (!enabled || !available || !ready || announced.has(scopeKey)) return
    const events = ['pointerdown', 'keydown'] as const
    const cleanup = () => events.forEach((name) => window.removeEventListener(name, onGesture))
    function onGesture() {
      cleanup()
      read()
    }
    // Cố đọc ngay; nếu trình duyệt chặn vì chưa có thao tác thì chờ lần chạm/bấm phím đầu tiên.
    function read() {
      const current = latest.current.counts
      if (!current || announced.has(scopeKey)) return
      const text = buildAlertSpeech(current, latest.current.warehouseName)
      let blocked = false
      const started = speak(text, () => {
        blocked = true
        announced.delete(scopeKey)
        events.forEach((name) => window.addEventListener(name, onGesture))
      })
      if (started && !blocked) announced.add(scopeKey)
    }
    read()
    return cleanup
  }, [enabled, available, ready, scopeKey])
}
