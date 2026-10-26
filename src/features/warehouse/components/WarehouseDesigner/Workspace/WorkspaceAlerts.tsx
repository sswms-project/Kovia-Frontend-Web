import { AlertCircle, Info, RefreshCw } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface WorkspaceAlertsProps {
  readonly canConfigure: boolean
  readonly saveError: string | null
  readonly hasConflict: boolean
  readonly isSaving: boolean
  readonly onReload: () => void
}

export function WorkspaceAlerts({
  canConfigure,
  saveError,
  hasConflict,
  isSaving,
  onReload,
}: WorkspaceAlertsProps) {
  return (
    <>
      {!canConfigure ? (
        <Alert className="border-x-0 border-t-0">
          <Info aria-hidden="true" />
          <AlertTitle>Chế độ xem</AlertTitle>
          <AlertDescription>
            Bạn có thể chọn và kiểm tra đối tượng, nhưng không thể thay đổi sơ đồ.
          </AlertDescription>
        </Alert>
      ) : null}
      {saveError ? (
        <Alert variant="destructive" className="border-x-0 border-t-0">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            {hasConflict ? 'Sơ đồ đã được thay đổi ở nơi khác' : 'Không thể lưu sơ đồ'}
          </AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
          {hasConflict ? (
            <AlertAction>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={isSaving}
                onClick={onReload}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Tải bản mới
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}
    </>
  )
}
