import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StockAlertPanel, stockAlertTitles, type StockAlertPanelProps } from './StockAlertPanel'

interface StockAlertDialogProps extends StockAlertPanelProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onRestoreFocus: () => void
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly warehouseLabel: string
}

export function StockAlertDialog({
  open,
  onClose,
  onRestoreFocus,
  search,
  onSearchChange,
  warehouseLabel,
  ...panel
}: StockAlertDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent
        className="flex h-[90svh] max-h-[95svh] min-h-0 flex-col overflow-hidden sm:max-w-6xl [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-2"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>{stockAlertTitles[panel.kind]}</DialogTitle>
          <DialogDescription>{warehouseLabel}</DialogDescription>
        </DialogHeader>
        <StockAlertPanel
          {...panel}
          expanded
          searchControl={
            <Input
              aria-label="Tìm trong toàn bộ cảnh báo"
              placeholder="Tìm mã, tên hàng hoặc số lô…"
              maxLength={200}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          }
        />
      </DialogContent>
    </Dialog>
  )
}
