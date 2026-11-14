import { AI_PANEL_DEFAULT_WIDTH, type AiPanelMode } from './ai-panel-layout'

export interface AiPanelPreferences {
  readonly isOpen: boolean
  readonly width: number
  readonly mode: AiPanelMode
}

export const DEFAULT_AI_PANEL_PREFERENCES: AiPanelPreferences = {
  isOpen: false,
  width: AI_PANEL_DEFAULT_WIDTH,
  mode: 'docked',
}

// Per user: a shared browser must not carry one person's layout to the next account.
const storageKey = (userId: string) => `kovia-ai-panel:${userId}`

function isPreferences(value: unknown): value is AiPanelPreferences {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.isOpen === 'boolean' &&
    typeof candidate.width === 'number' &&
    Number.isFinite(candidate.width) &&
    (candidate.mode === 'docked' || candidate.mode === 'expanded')
  )
}

export function readAiPanelPreferences(userId: string): AiPanelPreferences {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? 'null')
    return isPreferences(parsed) ? parsed : DEFAULT_AI_PANEL_PREFERENCES
  } catch {
    return DEFAULT_AI_PANEL_PREFERENCES
  }
}

export function writeAiPanelPreferences(userId: string, preferences: AiPanelPreferences) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
  } catch {
    // Storage full or blocked: the layout simply is not remembered.
  }
}
