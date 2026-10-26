export interface CanvasPalette {
  background: string
  foreground: string
  muted: string
  border: string
  primary: string
  accent: string
  destructive: string
  errorContainer: string
  card: string
  warning: string
  warningContainer: string
  selectionFill: string
  selectionForeground: string
  viewerSelected: string
  viewerOccupied: string
  heatLow: string
  heatMid: string
  heatHigh: string
}

function parseHexColor(color: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (!match) return null
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ] as const
}

function getRelativeLuminance(color: string) {
  const rgb = parseHexColor(color)
  if (!rgb) return null
  const channels = rgb.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

function getContrastRatio(first: string, second: string) {
  const firstLuminance = getRelativeLuminance(first)
  const secondLuminance = getRelativeLuminance(second)
  if (firstLuminance === null || secondLuminance === null) return 0
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

export function getReadableCanvasColor(background: string, palette: CanvasPalette) {
  return getContrastRatio(background, palette.foreground) >=
    getContrastRatio(background, palette.background)
    ? palette.foreground
    : palette.background
}
