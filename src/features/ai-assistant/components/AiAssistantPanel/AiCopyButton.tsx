'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

const COPIED_FEEDBACK_MS = 1500

export function AiCopyButton({ text }: { readonly text: string }) {
  const [isCopied, setIsCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    []
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      resetTimer.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS)
    } catch (error) {
      logger.error(error)
      toast.error('Không sao chép được nội dung.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={isCopied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
      className="text-muted-foreground"
      onClick={() => void handleCopy()}
    >
      {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  )
}
