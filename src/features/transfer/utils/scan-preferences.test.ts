import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SCAN_PREFERENCES,
  getScanPreferences,
  resetScanPreferencesCache,
  setScanPreferences,
} from './scan-preferences'

afterEach(() => {
  window.localStorage.clear()
  resetScanPreferencesCache()
})

describe('scan preferences', () => {
  it('starts with typing allowed, feedback on and quantity prefilled', () => {
    expect(getScanPreferences()).toEqual(DEFAULT_SCAN_PREFERENCES)
    expect(DEFAULT_SCAN_PREFERENCES).toEqual({
      scannerMode: false,
      feedback: true,
      eachUnit: false,
    })
  })

  it('persists a change and keeps the other settings', () => {
    setScanPreferences({ scannerMode: true })
    resetScanPreferencesCache()
    expect(getScanPreferences()).toEqual({ scannerMode: true, feedback: true, eachUnit: false })
  })

  it('falls back to defaults when the stored value is corrupt', () => {
    window.localStorage.setItem('kovia.transfer.scan-preferences', '{not json')
    resetScanPreferencesCache()
    expect(getScanPreferences()).toEqual(DEFAULT_SCAN_PREFERENCES)
    window.localStorage.setItem('kovia.transfer.scan-preferences', '{"feedback":"yes"}')
    resetScanPreferencesCache()
    expect(getScanPreferences().feedback).toBe(true)
  })
})
