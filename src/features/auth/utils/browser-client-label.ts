export function getBrowserClientLabel() {
  const agent = navigator.userAgent
  const browser = /Edg/i.test(agent)
    ? 'Edge'
    : /Firefox|FxiOS/i.test(agent)
      ? 'Firefox'
      : /Chrome|CriOS/i.test(agent)
        ? 'Chrome'
        : /Safari/i.test(agent)
          ? 'Safari'
          : 'Trình duyệt web'
  const platform = /Android/i.test(agent)
    ? 'Android'
    : /iPhone|iPad/i.test(agent)
      ? 'iOS'
      : /Windows/i.test(agent)
        ? 'Windows'
        : /Macintosh/i.test(agent)
          ? 'macOS'
          : null
  return platform ? `${browser} trên ${platform}` : browser
}
