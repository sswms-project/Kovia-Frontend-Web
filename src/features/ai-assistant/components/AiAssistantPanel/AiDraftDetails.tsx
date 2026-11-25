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
    // The label column is capped at 45%: with plain `auto`, one long label (a product row "SKU · name") took the whole
    // width and squeezed every value into a one-character column in the narrow chat panel.
    <dl className="grid grid-cols-[fit-content(45%)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      {details.map((detail, index) => (
        <Fragment key={`${detail.label}-${index}`}>
          <dt className="text-muted-foreground min-w-0 break-words">{detail.label}</dt>
          <dd className="min-w-0 font-medium break-words">
            <AiCodeText>{detail.value}</AiCodeText>
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}
