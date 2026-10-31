'use client'

import { useCallback, useSyncExternalStore } from 'react'

export interface SpeechPreferences {
  /** Tự động đọc cảnh báo tồn kho khẩn cấp khi mở tổng quan kho. */
  readonly autoReadAlerts: boolean
}

export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = { autoReadAlerts: false }

const STORAGE_KEY = 'kovia.speech.preferences'
const listeners = new Set<() => void>()
let cached: SpeechPreferences | null = null

function read(): SpeechPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SPEECH_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SPEECH_PREFERENCES
    const { autoReadAlerts } = parsed as Record<string, unknown>
    return {
      autoReadAlerts:
        typeof autoReadAlerts === 'boolean'
          ? autoReadAlerts
          : DEFAULT_SPEECH_PREFERENCES.autoReadAlerts,
    }
  } catch {
    return DEFAULT_SPEECH_PREFERENCES
  }
}

export function getSpeechPreferences(): SpeechPreferences {
  if (typeof window === 'undefined') return DEFAULT_SPEECH_PREFERENCES
  cached ??= read()
  return cached
}

export function setSpeechPreferences(patch: Partial<SpeechPreferences>) {
  cached = { ...getSpeechPreferences(), ...patch }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  } catch {
    // Không lưu được thì chỉ giữ trong bộ nhớ.
  }
  for (const listener of listeners) listener()
}

/** Chỉ dùng trong test để quay về trạng thái ban đầu. */
export function resetSpeechPreferencesCache() {
  cached = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSpeechPreferences() {
  const preferences = useSyncExternalStore(
    subscribe,
    getSpeechPreferences,
    () => DEFAULT_SPEECH_PREFERENCES
  )
  const update = useCallback((patch: Partial<SpeechPreferences>) => setSpeechPreferences(patch), [])
  return [preferences, update] as const
}
