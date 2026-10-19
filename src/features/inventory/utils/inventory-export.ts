const FALLBACK_FILENAME = 'kovia-ton-kho-kha-dung.xlsx'

export function inventoryExportFileName(disposition: unknown): string {
  if (typeof disposition !== 'string') return FALLBACK_FILENAME
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition)
  let name = encoded ?? plain?.[1] ?? plain?.[2] ?? ''
  if (encoded) {
    try {
      name = decodeURIComponent(encoded)
    } catch {
      return FALLBACK_FILENAME
    }
  }
  name = name.trim()
  return name.length <= 180 && /^[\p{L}\p{N} _().-]+\.xlsx$/iu.test(name) && !name.startsWith('.')
    ? name
    : FALLBACK_FILENAME
}

export function downloadInventoryExport(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  try {
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    // Give the browser time to consume the download before releasing the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
