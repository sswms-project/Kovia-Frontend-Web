export function createClientKey() {
  return globalThis.crypto?.randomUUID?.() ?? `layout-${Date.now()}-${Math.random()}`
}

export function getDuplicateLabel(label: string): string {
  const suffix = ' bản sao'
  return `${label.slice(0, 100 - suffix.length).trimEnd()}${suffix}`
}
