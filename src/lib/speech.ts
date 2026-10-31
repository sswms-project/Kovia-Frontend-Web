const VI_LANG = 'vi-VN'

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

function findViVoice(): SpeechSynthesisVoice | undefined {
  return synth()
    ?.getVoices()
    .find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('vi'))
}

/** Trình duyệt có đọc được tiếng Việt hay không (danh sách giọng có thể nạp muộn). */
export function isVietnameseSpeechAvailable(): boolean {
  return Boolean(findViVoice())
}

export function stopSpeaking() {
  synth()?.cancel()
}

/** Đọc `text` bằng giọng tiếng Việt; trả về false nếu không đọc được. */
export function speak(text: string, onBlocked?: () => void): boolean {
  const engine = synth()
  const voice = findViVoice()
  if (!engine || !voice || !text.trim()) return false
  engine.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang || VI_LANG
  // Trình duyệt chặn đọc khi chưa có thao tác của người dùng: báo lại để chờ lần chạm đầu tiên.
  utterance.onerror = (event) => {
    if (event.error === 'not-allowed') onBlocked?.()
  }
  engine.speak(utterance)
  return true
}

/** Gọi `onChange` khi danh sách giọng đọc thay đổi (Chrome nạp giọng bất đồng bộ). */
export function subscribeVoices(onChange: () => void): () => void {
  const engine = synth()
  if (!engine) return () => undefined
  engine.addEventListener('voiceschanged', onChange)
  return () => engine.removeEventListener('voiceschanged', onChange)
}
