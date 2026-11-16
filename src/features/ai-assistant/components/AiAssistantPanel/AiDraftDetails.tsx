import { Fragment } from 'react'
import type { AiActionDetail } from '../../types/ai-assistant.types'
import { AiCodeText } from './AiCodeText'

interface AiDraftDetailsProps {
  readonly details: readonly AiActionDetail[]
}

/** The label/value rows of a draft as the BE summarised it. */
export function AiDraftDetails({ details }: AiDraftDetailsProps) {
  if (details.length === 0) return null

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {details.map((detail, index) => (
        <Fragment key={`${detail.label}-${index}`}>
          <dt className="text-muted-foreground">{detail.label}</dt>
          <dd className="min-w-0 font-medium break-words">
            <AiCodeText>{detail.value}</AiCodeText>
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}
