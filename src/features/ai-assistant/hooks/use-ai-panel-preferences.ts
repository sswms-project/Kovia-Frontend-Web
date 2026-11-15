import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { AI_MOBILE_BREAKPOINT } from '../utils/ai-panel-layout'
import { readAiPanelPreferences, writeAiPanelPreferences } from '../utils/ai-panel-preferences'

/**
 * Restores the panel's open state, width and mode for this user, persists later changes, and wipes
 * everything user-specific (open conversation, cached history) when the user changes or leaves, so
 * one account's conversations never show for the next one.
 */
export function useAiPanelPreferences(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    const store = useAiAssistantPanelStore
    const saved = readAiPanelPreferences(userId)
    store.setState({
      // A phone shows the panel full screen, so it never reopens by itself after a reload.
      isOpen: saved.isOpen && window.innerWidth >= AI_MOBILE_BREAKPOINT,
      width: saved.width,
      mode: saved.mode,
    })
    // subscribe() fires only on later changes, so the values just restored are not written back.
    const unsubscribe = store.subscribe((state) => {
      if (state.isResizing) return
      writeAiPanelPreferences(userId, {
        isOpen: state.isOpen,
        width: state.width,
        mode: state.mode,
      })
    })

    return () => {
      unsubscribe()
      store.setState({ isOpen: false, conversationId: null, view: 'chat', isResizing: false })
      queryClient.removeQueries({ queryKey: queryKeys.aiAssistant.conversations })
      queryClient.removeQueries({ queryKey: queryKeys.aiAssistant.messagesAll })
    }
  }, [userId, queryClient])
}
