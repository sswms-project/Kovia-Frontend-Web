import type { Route } from 'next'
import Link from 'next/link'
import { Fragment, useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AiEntityLink } from '../../types/ai-assistant.types'
import {
  AI_MARKDOWN_INLINE_TOKEN,
  parseAiMarkdown,
  type AiMarkdownBlock,
} from '../../utils/ai-markdown'
import {
  createAiEntityLinker,
  getAiTableLinkColumns,
  type AiEntityLinker,
} from '../../utils/ai-entity-links'
import { AiMarkdownTable } from './AiMarkdownTable'

/** Linking context of one block: labels already linked in it, so context entities link once per block. */
interface InlineLinks {
  readonly linker: AiEntityLinker
  readonly linked: Set<string>
  readonly onNavigate?: () => void
}

function linkText(text: string, links: InlineLinks | null): ReactNode {
  if (!links) return text
  return links.linker.split(text, links.linked).map((segment, index) =>
    segment.link ? (
      <Link
        key={index}
        href={segment.link.url as Route}
        onNavigate={links.onNavigate}
        className="text-primary decoration-primary/40 hover:decoration-primary focus-visible:ring-ring rounded-sm underline decoration-dotted underline-offset-2 transition-colors duration-(--ai-motion-hover) outline-none focus-visible:ring-2 motion-reduce:transition-none"
      >
        {segment.text}
      </Link>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    )
  )
}

function renderInline(text: string, links: InlineLinks | null = null): ReactNode[] {
  return text
    .split(AI_MARKDOWN_INLINE_TOKEN)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold">
            {linkText(part.slice(2, -2), links)}
          </strong>
        )
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="bg-muted rounded-sm px-1 font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        )
      }
      return <Fragment key={index}>{linkText(part, links)}</Fragment>
    })
}

/** Thin caret at the end of text that is still streaming in. */
const STREAMING_CARET = (
  <span
    aria-hidden="true"
    className="bg-foreground/70 ml-0.5 inline-block h-[1.1em] w-0.5 animate-pulse align-text-bottom motion-reduce:animate-none"
  />
)

interface MarkdownBlockViewProps {
  readonly block: AiMarkdownBlock
  /** Rendered inline after the block's text (the streaming caret). */
  readonly trailing?: ReactNode
  readonly entities: readonly AiEntityLink[]
  readonly linker: AiEntityLinker | null
  readonly onNavigate?: () => void
}

function MarkdownBlockView({
  block,
  trailing,
  entities,
  linker,
  onNavigate,
}: MarkdownBlockViewProps) {
  // Fresh per block and per render: the "already linked" set must not leak between blocks or renders.
  const links = (): InlineLinks | null =>
    linker ? { linker, linked: new Set(), onNavigate } : null
  switch (block.kind) {
    case 'heading':
      return (
        <p className="text-foreground mt-1 font-semibold first:mt-0">
          {renderInline(block.text, links())}
          {trailing}
        </p>
      )
    case 'code':
      return (
        <pre className="bg-muted overflow-x-auto rounded-md px-3 py-2 font-mono text-xs leading-relaxed">
          <code>{block.lines.join('\n')}</code>
        </pre>
      )
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul'
      return (
        <ListTag
          className={cn(
            'marker:text-muted-foreground space-y-1 pl-5',
            block.ordered ? 'list-decimal' : 'list-disc'
          )}
        >
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item, links())}</li>
          ))}
        </ListTag>
      )
    }
    case 'table': {
      // Only the columns of record codes link, so the table is not all links.
      const linkColumns = linker ? getAiTableLinkColumns(block.rows, entities) : null
      const renderCell = (text: string, column?: number) =>
        renderInline(text, column !== undefined && linkColumns?.has(column) ? links() : null)
      return <AiMarkdownTable header={block.header} rows={block.rows} renderCell={renderCell} />
    }
    case 'paragraph': {
      const paragraphLinks = links()
      return (
        <p>
          {block.lines.map((line, index) => (
            <Fragment key={index}>
              {index > 0 ? <br /> : null}
              {renderInline(line, paragraphLinks)}
            </Fragment>
          ))}
          {trailing}
        </p>
      )
    }
  }
}

interface AiMarkdownProps {
  readonly content: string
  /** Shows a caret after the last text while the answer is still arriving. */
  readonly isStreaming?: boolean
  /** Verified records of this answer (`entity_links` card); their labels in the text become links. */
  readonly entities?: readonly AiEntityLink[]
  readonly onNavigate?: () => void
}

const NO_ENTITIES: readonly AiEntityLink[] = []

export function AiMarkdown({
  content,
  isStreaming = false,
  entities = NO_ENTITIES,
  onNavigate,
}: AiMarkdownProps) {
  // Saved messages keep their content; parse once instead of on every render of the thread.
  const blocks = useMemo(() => parseAiMarkdown(content), [content])
  const linker = useMemo(() => createAiEntityLinker(entities), [entities])
  const lastBlock = blocks.at(-1)
  const caretInline =
    isStreaming && (lastBlock?.kind === 'paragraph' || lastBlock?.kind === 'heading')

  return (
    <div className="flex min-w-0 flex-col gap-3 text-sm leading-relaxed break-words">
      {blocks.map((block, index) => (
        <MarkdownBlockView
          // Index keys keep each block's element while text streams in, so nothing remounts.
          key={index}
          block={block}
          trailing={caretInline && index === blocks.length - 1 ? STREAMING_CARET : null}
          entities={entities}
          linker={linker}
          onNavigate={onNavigate}
        />
      ))}
      {isStreaming && !caretInline ? <span className="leading-none">{STREAMING_CARET}</span> : null}
    </div>
  )
}
