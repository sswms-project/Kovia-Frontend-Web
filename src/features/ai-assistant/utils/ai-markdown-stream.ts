import { BULLET_ITEM, CODE_FENCE, ORDERED_ITEM, TABLE_ROW } from './ai-markdown'

/** A line that may still turn into a list marker, heading marker or table row once more text arrives. */
const AMBIGUOUS_LINE_START = /^\s*([-*•]|\d+[.)]?|#{1,6})?\s*$/

function isAtomicLine(line: string): boolean {
  return TABLE_ROW.test(line) || BULLET_ITEM.test(line) || ORDERED_ITEM.test(line)
}

/**
 * Cuts streamed markdown back to the part that renders the same once the rest arrives, so blocks
 * never flicker between kinds: an unclosed code block, an unfinished table row or list item, and a
 * table header still waiting for its separator line are held back until they are complete.
 */
export function holdIncompleteMarkdown(text: string): string {
  let lines = text.replace(/\r\n/g, '\n').split('\n')

  const fenceIndexes = lines.flatMap((line, index) => (CODE_FENCE.test(line) ? [index] : []))
  if (fenceIndexes.length % 2 === 1) lines = lines.slice(0, fenceIndexes.at(-1))

  const lastLine = lines.at(-1) ?? ''
  const isPartialLine = lines.length === text.split('\n').length
  if (
    isPartialLine &&
    (/^\s*\|/.test(lastLine) || isAtomicLine(lastLine) || AMBIGUOUS_LINE_START.test(lastLine))
  ) {
    lines = lines.slice(0, -1)
  }

  // A lone table row is a header until its separator arrives; shown alone it would be plain text.
  const last = lines.at(-1) ?? ''
  const previous = lines.at(-2) ?? ''
  if (TABLE_ROW.test(last) && !TABLE_ROW.test(previous)) lines = lines.slice(0, -1)

  return lines.join('\n')
}

/**
 * Moves a reveal position that falls inside a table, list or code block to that block's end:
 * structured blocks appear whole and are never typed out.
 */
export function snapRevealToBlock(text: string, position: number): number {
  if (position >= text.length) return text.length
  let offset = 0
  let isInFence = false
  let blockEnd: number | null = null
  for (const line of text.split('\n')) {
    const lineEnd = offset + line.length
    const isFence = CODE_FENCE.test(line)
    const isAtomic = isInFence || isFence || isAtomicLine(line)
    if (isFence) isInFence = !isInFence

    if (blockEnd !== null) {
      if (!isAtomic) return blockEnd
      blockEnd = lineEnd
    } else if (position <= offset) {
      return position
    } else if (position <= lineEnd && isAtomic) {
      blockEnd = lineEnd
    }
    offset = lineEnd + 1
  }
  return blockEnd ?? position
}

/**
 * Closes a `**bold**` or `` `code` `` the reveal has opened but not yet closed on the last line,
 * and drops a dangling half marker, so partial text renders formatted instead of with raw stars.
 */
export function balanceInlineMarkdown(text: string): string {
  const lineStart = text.lastIndexOf('\n') + 1
  let line = text.slice(lineStart)

  if (/(^|[^*])\*$/.test(line)) line = line.slice(0, -1)
  if ((line.split('**').length - 1) % 2 === 1) {
    line = /\*\*\s*$/.test(line) ? line.replace(/\*\*\s*$/, '') : `${line.trimEnd()}**`
  }
  if ((line.match(/`/g) ?? []).length % 2 === 1) {
    line = line.endsWith('`') ? line.slice(0, -1) : `${line}\``
  }
  return text.slice(0, lineStart) + line
}
