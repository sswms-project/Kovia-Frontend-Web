'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { useRefusalEvidence } from '../hooks/use-refusal-evidence'

export function RefusalEvidencePanel({
  state,
}: {
  readonly state: ReturnType<typeof useRefusalEvidence>
}) {
  return (
    <section className="space-y-3 border p-3 text-sm">
      <p>
        Phần từ chối không ghi tồn. Chỉ xác nhận khi bên giao giữ hoặc đã mang về; hàng kho vẫn giữ
        phải được theo dõi riêng.
      </p>
      <label className="flex items-start gap-2">
        <Checkbox
          checked={state.acknowledged}
          disabled={state.busy}
          onCheckedChange={state.toggle}
        />
        Bên giao đã giữ hoặc nhận lại phần hàng từ chối
      </label>
      <label className="block space-y-1">
        Bằng chứng kiểm / từ chối (tối đa 5 tệp, 10 MB mỗi tệp)
        <Input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.csv,.xlsx"
          disabled={state.busy || state.files.length >= 5}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void state.upload(file)
          }}
        />
      </label>
      {state.files.map((file) => (
        <div key={file.id} className="flex flex-wrap items-center gap-2">
          <span>{file.fileName}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={state.busy}
            onClick={() => state.remove(file.id)}
          >
            Bỏ tệp
          </Button>
        </div>
      ))}
      {state.busy && <p role="status">Đang tải bằng chứng…</p>}
      {state.error && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
    </section>
  )
}
