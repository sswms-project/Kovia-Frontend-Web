import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AI_PANEL_DEFAULT_WIDTH, useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { AiAssistantDock } from './AiAssistantDock'

const initial = useAiAssistantPanelStore.getState()

function renderDock() {
  render(
    <AiAssistantDock>
      <p>Nội dung trang</p>
    </AiAssistantDock>
  )
  return screen.getByText('Nội dung trang').parentElement as HTMLElement
}

afterEach(() => {
  act(() => useAiAssistantPanelStore.setState(initial, true))
})

describe('AiAssistantDock', () => {
  it('leaves the page alone while the assistant is closed', () => {
    const dock = renderDock()

    expect(dock.className).not.toContain('sm:pr-(--ai-panel-width)')
  })

  it('makes room for the panel at its current width once it opens', () => {
    const dock = renderDock()

    act(() => useAiAssistantPanelStore.getState().setOpen(true))
    expect(dock.className).toContain('sm:pr-(--ai-panel-width)')
    expect(dock.style.getPropertyValue('--ai-panel-width')).toBe(`${AI_PANEL_DEFAULT_WIDTH}px`)

    act(() => useAiAssistantPanelStore.getState().setWidth(560))
    expect(dock.style.getPropertyValue('--ai-panel-width')).toBe('560px')
  })

  it('animates opening but follows the pointer without lag while resizing', () => {
    const dock = renderDock()
    expect(dock.className).toContain('transition-[padding-right]')

    act(() => useAiAssistantPanelStore.getState().setResizing(true))
    expect(dock.className).not.toContain('transition-[padding-right]')
  })
})
