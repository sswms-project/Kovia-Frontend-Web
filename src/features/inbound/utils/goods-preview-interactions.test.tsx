import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { goodsPreviewInteractions } from './goods-preview-interactions'
afterEach(cleanup)
it('selects on row click/keyboard but leaves links, labels, role controls and ignored areas alone', () => {
  const select = vi.fn()
  render(
    <div data-testid="row" {...goodsPreviewInteractions(select, true)}>
      <span>Empty area</span>
      <a href="#detail">Code</a>
      <label>Label</label>
      <span role="button">Role control</span>
      <span data-row-ignore>Ignore</span>
    </div>
  )
  fireEvent.click(screen.getByText('Empty area'))
  fireEvent.keyDown(screen.getByTestId('row'), { key: 'Enter' })
  expect(select).toHaveBeenCalledTimes(2)
  for (const text of ['Code', 'Label', 'Role control', 'Ignore'])
    fireEvent.click(screen.getByText(text))
  expect(select).toHaveBeenCalledTimes(2)
  fireEvent.keyDown(screen.getByText('Role control'), { key: ' ' })
  expect(select).toHaveBeenCalledTimes(2)
  const range = document.createRange()
  range.selectNodeContents(screen.getByText('Empty area'))
  window.getSelection()?.addRange(range)
  fireEvent.click(screen.getByText('Empty area'))
  expect(select).toHaveBeenCalledTimes(2)
  window.getSelection()?.removeAllRanges()
})
