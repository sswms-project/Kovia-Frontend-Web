export type ScanFeedbackKind = 'success' | 'error'

const TONES: Record<
  ScanFeedbackKind,
  readonly { frequency: number; start: number; length: number }[]
> = {
  success: [{ frequency: 1760, start: 0, length: 0.09 }],
  error: [
    { frequency: 330, start: 0, length: 0.14 },
    { frequency: 330, start: 0.2, length: 0.14 },
  ],
}

const VIBRATION: Record<ScanFeedbackKind, number | number[]> = {
  success: 40,
  error: [120, 80, 120],
}

let audioContext: AudioContext | null = null

function playTones(kind: ScanFeedbackKind) {
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  audioContext ??= new Context()
  const context = audioContext
  if (context.state === 'suspended') void context.resume()
  for (const tone of TONES[kind]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const startAt = context.currentTime + tone.start
    oscillator.type = 'square'
    oscillator.frequency.value = tone.frequency
    gain.gain.setValueAtTime(0.08, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.length)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + tone.length)
  }
}

/**
 * Âm báo và rung sau mỗi lần quét: trong kho ồn nhân viên không nhìn màn hình nên cần biết ngay quét đúng hay sai.
 * Không bao giờ ném lỗi: thiết bị không hỗ trợ thì bỏ qua.
 */
export function playScanFeedback(kind: ScanFeedbackKind) {
  if (typeof window === 'undefined') return
  try {
    playTones(kind)
  } catch {
    // Trình duyệt chặn âm thanh: bỏ qua.
  }
  try {
    window.navigator.vibrate?.(VIBRATION[kind])
  } catch {
    // Thiết bị không rung được: bỏ qua.
  }
}
