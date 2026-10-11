'use client'

import { useCallback, useSyncExternalStore } from 'react'

export interface ScanPreferences {
  /** Dùng máy quét Bluetooth/PDA: ẩn bàn phím ảo trên điện thoại khi chạm vào ô quét. */
  readonly scannerMode: boolean
  /** Âm báo và rung khi quét đúng hoặc sai. */
  readonly feedback: boolean
  /** Mỗi lần quét mã hàng tính 1 đơn vị thay vì tự điền số lượng gợi ý. */
  readonly eachUnit: boolean
}

export const DEFAULT_SCAN_PREFERENCES: ScanPreferences = {
  scannerMode: false,
  feedback: true,
  eachUnit: false,
}

const STORAGE_KEY = 'kovia.transfer.scan-preferences'
const listeners = new Set<() => void>()
let cached: ScanPreferences | null = null

function read(): ScanPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SCAN_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SCAN_PREFERENCES
    const record = parsed as Record<string, unknown>
    return {
      scannerMode:
        typeof record.scannerMode === 'boolean'
          ? record.scannerMode
          : DEFAULT_SCAN_PREFERENCES.scannerMode,
      feedback:
        typeof record.feedback === 'boolean' ? record.feedback : DEFAULT_SCAN_PREFERENCES.feedback,
      eachUnit:
        typeof record.eachUnit === 'boolean' ? record.eachUnit : DEFAULT_SCAN_PREFERENCES.eachUnit,
    }
  } catch {
    // Trình duyệt chặn lưu trữ: dùng mặc định, vẫn đổi được trong phiên.
    return DEFAULT_SCAN_PREFERENCES
  }
}

export function getScanPreferences(): ScanPreferences {
  if (typeof window === 'undefined') return DEFAULT_SCAN_PREFERENCES
  cached ??= read()
  return cached
}

export function setScanPreferences(patch: Partial<ScanPreferences>) {
  cached = { ...getScanPreferences(), ...patch }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  } catch {
    // Không lưu được thì chỉ giữ trong bộ nhớ.
  }
  for (const listener of listeners) listener()
}

/** Chỉ dùng trong test để quay về trạng thái ban đầu. */
export function resetScanPreferencesCache() {
  cached = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useScanPreferences() {
  const preferences = useSyncExternalStore(
    subscribe,
    getScanPreferences,
    () => DEFAULT_SCAN_PREFERENCES
  )
  const update = useCallback((patch: Partial<ScanPreferences>) => setScanPreferences(patch), [])
  return [preferences, update] as const
}
