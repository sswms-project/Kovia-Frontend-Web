import { Fragment } from 'react'
import { parseAiMarkdown } from '@/features/ai-assistant/utils/ai-markdown'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function inline(text: string) {
  const tokens = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]\n]+\]\([^)\s]+\))/g
  return text
    .split(tokens)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={index}>{part.slice(2, -2)}</strong>
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={index}>{part.slice(1, -1)}</code>
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
      if (link) {
        const url = URL.parse(link[2] ?? '')
        if (url && ['https:', 'http:', 'mailto:'].includes(url.protocol)) {
          return (
            <a key={index} href={url.href} className="text-primary underline">
              {link[1]}
            </a>
          )
        }
      }
      return <Fragment key={index}>{part}</Fragment>
    })
}

export function LegalDocumentContent({ content }: { readonly content: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 text-sm leading-relaxed break-words">
      {parseAiMarkdown(content).map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <h2 key={index} className="text-base font-semibold">
                {inline(block.text)}
              </h2>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={index} className={block.ordered ? 'list-decimal pl-6' : 'list-disc pl-6'}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item)}</li>
                ))}
              </List>
            )
          }
          case 'table':
            return (
              <Table key={index}>
                <TableHeader>
                  <TableRow>
                    {block.header.map((cell, cellIndex) => (
                      <TableHead key={cellIndex}>{inline(cell)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>{inline(cell)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          case 'code':
            return (
              <pre key={index} className="overflow-x-auto font-mono text-xs whitespace-pre">
                {block.lines.join('\n')}
              </pre>
            )
          case 'paragraph':
            return (
              <p key={index} className="whitespace-pre-line">
                {inline(block.lines.join('\n'))}
              </p>
            )
        }
      })}
    </div>
  )
}
