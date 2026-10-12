import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { AiCard } from '../../types/ai-assistant.types'
import { AI_NAVIGATION_ICONS, DefaultAiNavigationIcon } from '../../utils/ai-assistant-icons'
import { isAiAppPath } from '../../utils/ai-assistant-links'
import { AI_ACTION_TILE_CLASS, AiActionTileBody } from './AiActionTile'

interface AiNavigationCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

export function AiNavigationCard({ card, onNavigate }: AiNavigationCardProps) {
  if (!isAiAppPath(card.actionUrl)) return null

  return (
    <Link
      // The path comes from WMS-Model's fixed route templates and is re-validated by the BE and isAiAppPath.
      href={card.actionUrl as Route}
      onNavigate={onNavigate}
      className={AI_ACTION_TILE_CLASS}
    >
      <AiActionTileBody
        icon={AI_NAVIGATION_ICONS[card.icon ?? ''] ?? DefaultAiNavigationIcon}
        title={card.title ?? ''}
        description={card.description}
        trailingIcon={ArrowRight}
      />
    </Link>
  )
}
