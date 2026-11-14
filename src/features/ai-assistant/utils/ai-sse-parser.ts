export interface AiSseEvent {
  readonly event: string
  readonly data: string
}

/**
 * Incremental Server-Sent Events parser: network chunks may end anywhere (mid-line, mid-event),
 * so the unfinished tail is buffered until its blank-line terminator arrives.
 */
export function createAiSseParser() {
  let buffer = ''

  return (chunk: string): AiSseEvent[] => {
    buffer += chunk.replace(/\r\n?/g, '\n')
    const events: AiSseEvent[] = []
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        // Lines starting with ':' are comments (keep-alive pings).
        if (!line || line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') event = value
        else if (field === 'data') data.push(value)
      }
      if (data.length > 0) events.push({ event, data: data.join('\n') })
    }
    return events
  }
}

/**
 * Contract v2 numbers every event (`seq`, from 1). An event not newer than the last applied one is a
 * duplicate or arrived out of order and is dropped; events without `seq` (older BE) pass through.
 */
export function isFreshAiStreamSeq(lastSeq: number, seq: unknown): boolean {
  return typeof seq !== 'number' || seq > lastSeq
}
