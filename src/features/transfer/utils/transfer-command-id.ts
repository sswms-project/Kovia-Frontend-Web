/**
 * Mã thao tác sinh một lần cho mỗi ý định của người dùng (mở hộp thoại lấy hàng, đổi vị trí...). Gửi lại cùng mã khi
 * mạng chậm thì BE không ghi lần hai. `crypto.randomUUID` chỉ có trên trang an toàn nên cần phương án dự phòng
 * (máy quét thường chạy qua HTTP trong mạng nội bộ).
 */
export function newCommandId(): string {
  const webCrypto = globalThis.crypto
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof webCrypto?.getRandomValues === 'function') webCrypto.getRandomValues(bytes)
  else bytes.forEach((_, index) => (bytes[index] = Math.floor(Math.random() * 256)))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
