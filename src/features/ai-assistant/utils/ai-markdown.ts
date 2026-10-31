export type AiMarkdownBlock =
  | { readonly kind: 'paragraph'; readonly lines: readonly string[] }
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
  | {
      readonly kind: 'table'
      readonly header: readonly string[]
      readonly rows: readonly (readonly string[])[]
    }

const BULLET_ITEM = /^\s*[-*•]\s+(.*)$/
const ORDERED_ITEM = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_SEPARATOR = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*(:?-{2,}:?\s*)?\|?\s*$/

/** Splits a line into plain text and the `**bold**` / `` `code` `` tokens (kept in the result). */
export const AI_MARKDOWN_INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isBlockStart(line: string): boolean {
  return (
    TABLE_ROW.test(line) || BULLET_ITEM.test(line) || ORDERED_ITEM.test(line) || HEADING.test(line)
  )
}

/**
 * Parses the small markdown subset the assistant is instructed to use (paragraphs, headings,
 * lists, tables, bold, inline code). Output is plain data rendered as React elements — model text
 * is never injected as HTML.
 */
export function parseAiMarkdown(text: string): AiMarkdownBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: AiMarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index += 1
      continue
    }

    if (TABLE_ROW.test(line) && TABLE_SEPARATOR.test(lines[index + 1] ?? '')) {
      const header = splitTableRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && TABLE_ROW.test(lines[index] ?? '')) {
        rows.push(splitTableRow(lines[index] ?? ''))
        index += 1
      }
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', text: heading[1] ?? '' })
      index += 1
      continue
    }

    const ordered = !BULLET_ITEM.test(line) && ORDERED_ITEM.test(line)
    if (ordered || BULLET_ITEM.test(line)) {
      const pattern = ordered ? ORDERED_ITEM : BULLET_ITEM
      const items: string[] = []
      let match = pattern.exec(lines[index] ?? '')
      while (match) {
        items.push(match[1] ?? '')
        index += 1
        match = index < lines.length ? pattern.exec(lines[index] ?? '') : null
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (!current.trim() || isBlockStart(current)) break
      paragraph.push(current)
      index += 1
    }
    if (paragraph.length === 0) {
      // A table-looking row without a separator line: show it as text.
      paragraph.push(line)
      index += 1
    }
    blocks.push({ kind: 'paragraph', lines: paragraph })
  }

  return blocks
}
