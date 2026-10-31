'use client'

import { useSyncExternalStore } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { isVietnameseSpeechAvailable, speak, subscribeVoices } from '@/lib/speech'
import { useSpeechPreferences } from '@/lib/speech-preferences'
import { buildAlertSpeech, type AlertSpeechCounts } from '../../utils/alert-speech'

interface AlertSpeechControlProps {
  readonly counts: AlertSpeechCounts | undefined
  readonly warehouseName?: string
}

export function useVietnameseSpeechAvailable() {
  return useSyncExternalStore(subscribeVoices, isVietnameseSpeechAvailable, () => false)
}

export function AlertSpeechControl({ counts, warehouseName }: AlertSpeechControlProps) {
  const available = useVietnameseSpeechAvailable()
  const [preferences, update] = useSpeechPreferences()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Đọc cảnh báo tồn kho"
          title="Đọc cảnh báo tồn kho"
        >
          <Volume2 aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="flex flex-col gap-3">
        {available ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!counts}
              onClick={() => counts && speak(buildAlertSpeech(counts, warehouseName))}
            >
              Đọc cảnh báo ngay
            </Button>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="overview-auto-read">Tự động đọc cảnh báo khẩn</Label>
              <Switch
                id="overview-auto-read"
                checked={preferences.autoReadAlerts}
                onCheckedChange={(autoReadAlerts) => update({ autoReadAlerts })}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Chỉ đọc số lượng mặt hàng dưới mức tối thiểu, sắp hết hạn, quá hạn. Mỗi kho chỉ đọc
              một lần mỗi phiên; nếu trình duyệt chặn âm thanh, sẽ đọc ở lần bấm đầu tiên.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Trình duyệt này chưa có giọng đọc tiếng Việt nên không thể đọc cảnh báo.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
