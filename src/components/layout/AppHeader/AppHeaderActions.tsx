'use client'

import { canUseAiAssistant } from '@/config/ai-assistant-access'
import { AiAssistantLauncher } from '@/features/ai-assistant/components/AiAssistantPanel'
import { NotificationHeaderController } from '@/features/platform-services/components/NotificationHeaderController'
import { UserMenu } from '@/components/UserMenu'
import { useAuthStore } from '@/stores/auth.store'
import { ThemeToggle } from '../ThemeToggle'

export function AppHeaderActions() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex shrink-0 items-center gap-1">
      <AiAssistantLauncher canUseAiAssistant={canUseAiAssistant(user)} />
      <NotificationHeaderController />
      <div className="hidden sm:block">
        <ThemeToggle />
      </div>
      <UserMenu />
    </div>
  )
}
