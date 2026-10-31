import { Fragment, type ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AI_MARKDOWN_INLINE_TOKEN,
  parseAiMarkdown,
  type AiMarkdownBlock,
} from '../../utils/ai-markdown'

function renderInline(text: string): ReactNode[] {
  return text
    .split(AI_MARKDOWN_INLINE_TOKEN)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
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
      return <Fragment key={index}>{part}</Fragment>
    })
}

interface MarkdownBlockViewProps {
  readonly block: AiMarkdownBlock
}

function MarkdownBlockView({ block }: MarkdownBlockViewProps) {
  switch (block.kind) {
    case 'heading':
      return <p className="font-semibold">{renderInline(block.text)}</p>
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul'
      return (
        <ListTag
          className={block.ordered ? 'list-decimal space-y-0.5 pl-4' : 'list-disc space-y-0.5 pl-4'}
        >
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ListTag>
      )
    }
    case 'table':
      return (
        <div className="bg-card overflow-x-auto rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                {block.header.map((cell, index) => (
                  <TableHead key={index} className="h-8 px-2 whitespace-nowrap">
                    {renderInline(cell)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="px-2 py-1.5">
                      {renderInline(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    case 'paragraph':
      return (
        <p className="leading-relaxed">
          {block.lines.map((line, index) => (
            <Fragment key={index}>
              {index > 0 ? <br /> : null}
              {renderInline(line)}
            </Fragment>
          ))}
        </p>
      )
  }
}

interface AiMarkdownProps {
  readonly content: string
}

export function AiMarkdown({ content }: AiMarkdownProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm break-words">
      {parseAiMarkdown(content).map((block, index) => (
        <MarkdownBlockView key={index} block={block} />
      ))}
    </div>
  )
}
