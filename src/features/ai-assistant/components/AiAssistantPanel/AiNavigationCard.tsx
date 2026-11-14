import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AiCard } from '../../types/ai-assistant.types'
import { isAiAppPath } from '../../utils/ai-assistant-links'
import { getAiNavigationView } from '../../utils/ai-navigation-card'
import { AI_ACTION_TILE_CLASS, AiActionTileBody } from './AiActionTile'

interface AiNavigationCardProps {
  readonly card: AiCard
  readonly onNavigate: () => void
}

export function AiNavigationCard({ card, onNavigate }: AiNavigationCardProps) {
  if (!isAiAppPath(card.actionUrl)) return null
  // The path comes from WMS-Model's fixed route templates and is re-validated by the BE and isAiAppPath.
  const href = card.actionUrl as Route
  const view = getAiNavigationView(card)

  // Ctrl/Cmd/middle click on the Link opens a new tab natively (and skips onNavigate, so the panel
  // stays as it is); records also get an explicit button for that.
  const tile = (
    <Link href={href} onNavigate={onNavigate} className={AI_ACTION_TILE_CLASS}>
      <AiActionTileBody
        icon={view.icon}
        title={view.label}
        description={view.description}
        trailingIcon={ArrowRight}
      />
    </Link>
  )
  if (!view.isRecord) return tile

  return (
    <div className="flex min-w-0 items-stretch gap-1">
      {tile}
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-auto min-h-9 shrink-0"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${view.label} (mở trong tab mới)`}
          title="Mở trong tab mới"
        >
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </div>
  )
}
