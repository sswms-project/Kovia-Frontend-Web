import { AI_CARD_TYPES, type AiCard, type AiEntityLink } from '../types/ai-assistant.types'
import { isAiAppPath } from './ai-assistant-links'

/**
 * Records named in an answer become links only through the `entity_links` card: the BE has checked each
 * type, ID, path and the reader's permission. Text is matched against those labels exactly — never a guess
 * that "something looks like a code".
 */
export type AiEntitySegment =
  | { readonly text: string; readonly link?: undefined }
  | { readonly text: string; readonly link: AiEntityLink }

/** Context (where / who) rather than the record itself: linked once per block so a table is not all links. */
const CONTEXT_TYPES: ReadonlySet<string> = new Set(['warehouse', 'supplier', 'stock_recipient'])

/** Letters, digits, `_` and `-` continue a code: "XK000008" must not match inside "XK0000081". */
const WORD = '[\\p{L}\\p{N}_-]'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getAiEntityLinks(cards: readonly AiCard[]): readonly AiEntityLink[] {
  return cards
    .filter((card) => card.type === AI_CARD_TYPES.entityLinks)
    .flatMap((card) => card.entities ?? [])
    .filter((entity) => isAiAppPath(entity.url) && entity.label.trim().length >= 2)
}

export function isAiRecordLink(link: AiEntityLink): boolean {
  return !CONTEXT_TYPES.has(link.type)
}

export interface AiEntityLinker {
  /** Splits plain text into text and linked labels. `linked` is shared by one block (paragraph, list item, table). */
  split(
    text: string,
    linked: Set<string>,
    allow?: (link: AiEntityLink) => boolean
  ): AiEntitySegment[]
}

export function createAiEntityLinker(entities: readonly AiEntityLink[]): AiEntityLinker | null {
  if (entities.length === 0) return null
  const byLabel = new Map<string, AiEntityLink>()
  // A label shared by two different records stays plain text: the link could open the wrong one.
  const ambiguous = new Set<string>()
  for (const entity of entities) {
    const label = entity.label.trim()
    const known = byLabel.get(label)
    if (known && known.url !== entity.url) ambiguous.add(label)
    else byLabel.set(label, entity)
  }
  for (const label of ambiguous) byLabel.delete(label)
  if (byLabel.size === 0) return null

  // Longest first, so "Kho Hà Nội 2" wins over "Kho Hà Nội".
  const labels = [...byLabel.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`(?<!${WORD})(${labels.join('|')})(?!${WORD})`, 'gu')

  return {
    split(text, linked, allow) {
      const segments: AiEntitySegment[] = []
      let last = 0
      for (const match of text.matchAll(pattern)) {
        const link = byLabel.get(match[0])
        const index = match.index ?? 0
        if (!link || (allow && !allow(link))) continue
        if (!isAiRecordLink(link) && linked.has(link.url)) continue
        linked.add(link.url)
        if (index > last) segments.push({ text: text.slice(last, index) })
        segments.push({ text: match[0], link })
        last = index + match[0].length
      }
      if (last < text.length) segments.push({ text: text.slice(last) })
      return segments
    },
  }
}

/**
 * Table columns whose cells link: every column naming records (the rows' own codes, e.g. SKU and receipt), else the
 * first column naming a context entity. Names repeated on every row (warehouse, recipient) stay text when the row
 * already has a record to open.
 */
export function getAiTableLinkColumns(
  rows: readonly (readonly string[])[],
  entities: readonly AiEntityLink[]
): ReadonlySet<number> {
  const columns = new Set<number>()
  if (entities.length === 0) return columns
  const width = Math.max(0, ...rows.map((row) => row.length))
  let fallback: number | null = null
  for (let column = 0; column < width; column += 1) {
    // A cell may carry more than the code ("GR-1 (Chờ duyệt)"): any linked label inside it counts.
    const cells = rows.map((row) => row[column] ?? '')
    const named = entities.filter((entity) =>
      cells.some((cell) => cell.includes(entity.label.trim()))
    )
    if (named.some(isAiRecordLink)) columns.add(column)
    else if (fallback === null && named.length > 0) fallback = column
  }
  if (columns.size === 0 && fallback !== null) columns.add(fallback)
  return columns
}
