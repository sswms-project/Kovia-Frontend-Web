import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LegalDocumentContent } from './LegalDocumentContent'

describe('LegalDocumentContent', () => {
  it('renders headings and links without interpreting HTML or unsafe URLs', () => {
    const { container } = render(
      <LegalDocumentContent
        content={[
          '## Phạm vi sử dụng',
          'Văn bản **Kovia**. [Hỗ trợ](https://example.com/help)',
          '<img src=x onerror=alert(1)> [Không an toàn](javascript:alert)',
        ].join('\n\n')}
      />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Phạm vi sử dụng' })).toBeInTheDocument()
    expect(screen.getByText('Kovia').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'Hỗ trợ' })).toHaveAttribute(
      'href',
      'https://example.com/help'
    )
    expect(screen.queryByRole('link', { name: 'Không an toàn' })).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
