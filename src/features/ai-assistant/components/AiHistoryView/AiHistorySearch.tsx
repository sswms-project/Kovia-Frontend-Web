import type { KeyboardEvent, Ref } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AiHistorySearchProps {
  readonly value: string
  readonly inputRef: Ref<HTMLInputElement>
  readonly onChange: (value: string) => void
  readonly onArrowDown: () => void
}

export function AiHistorySearch({ value, inputRef, onChange, onArrowDown }: AiHistorySearchProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onArrowDown()
    } else if (event.key === 'Escape' && value) {
      // First Escape clears the query; the shell must not also close the panel.
      event.preventDefault()
      event.stopPropagation()
      onChange('')
    }
  }

  return (
    <div className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Tìm theo tiêu đề cuộc trò chuyện"
        placeholder="Tìm theo tiêu đề…"
        autoComplete="off"
        className="h-9 pr-8 pl-8 text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Xóa từ khóa tìm kiếm"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          onClick={() => onChange('')}
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
