'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Radar, Sparkles, Trash2 } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { cn } from '@/lib/utils'
import type { WatchRule } from '../../types/ai-alerts.types'
import { RULE_STATUS_LABELS, formatAlertTime } from '../../utils/ai-alerts-format'

export interface RuleEvaluationNotice {
  readonly ruleId: string
  readonly message: string
  readonly isError: boolean
}

interface WatchRuleListProps {
  readonly rules: WatchRule[]
  readonly maxRules: number | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly highlightedRuleId: string | null
  readonly pendingRuleId: string | null
  readonly evaluationNotice: RuleEvaluationNotice | null
  readonly canOpenAssistant: boolean
  readonly onOpenAssistant: () => void
  readonly onChangeStatus: (rule: WatchRule) => void
  readonly onEvaluate: (rule: WatchRule) => void
  readonly onDelete: (rule: WatchRule) => void
  readonly onRetry: () => void
}

const EXAMPLE_PROMPTS = [
  'Báo tôi khi tồn khả dụng của Sữa tươi 1L tại Kho Thủ Đức dưới 50 thùng.',
  'Theo dõi phiếu xuất ở Kho Bình Dương chờ xử lý quá 24 giờ.',
  'Nhắc tôi khi có lô hàng sắp hết hạn trong 7 ngày.',
]

export function WatchRuleList(props: WatchRuleListProps) {
  const [ruleToDelete, setRuleToDelete] = useState<WatchRule | null>(null)
  return (
    <OperationalListPanel aria-labelledby="watch-rules-title">
      <div className="flex shrink-0 flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="watch-rules-title" className="text-sm font-semibold">
            Quy tắc theo dõi
          </h2>
          {props.maxRules !== null ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              Đã dùng {props.rules.length}/{props.maxRules} quy tắc
            </span>
          ) : null}
        </div>
        <CreateHint
          canOpenAssistant={props.canOpenAssistant}
          onOpenAssistant={props.onOpenAssistant}
        />
      </div>
      {props.isLoading ? (
        <OperationalLoadingState rows={4} />
      ) : props.isError ? (
        <OperationalErrorState title="Không thể tải quy tắc theo dõi" onRetry={props.onRetry} />
      ) : (
        <ItemGroup data-slot="operational-list-body" className="gap-0 overflow-y-auto">
          {props.rules.length === 0 ? <EmptyRules /> : null}
          {props.rules.map((rule) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              isHighlighted={rule.id === props.highlightedRuleId}
              isPending={rule.id === props.pendingRuleId}
              notice={props.evaluationNotice?.ruleId === rule.id ? props.evaluationNotice : null}
              onChangeStatus={props.onChangeStatus}
              onEvaluate={props.onEvaluate}
              onDelete={setRuleToDelete}
            />
          ))}
          <p className="text-muted-foreground border-t px-4 py-3 text-xs">
            Việc mới được giao luôn được thông báo, không cần tạo quy tắc.
          </p>
        </ItemGroup>
      )}
      <AlertDialog
        open={ruleToDelete !== null}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa quy tắc theo dõi?</AlertDialogTitle>
            <AlertDialogDescription>
              {ruleToDelete?.label}. Kovia sẽ ngừng kiểm tra điều kiện này. Cảnh báo đã có vẫn được
              giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (ruleToDelete) props.onDelete(ruleToDelete)
                setRuleToDelete(null)
              }}
            >
              Xóa quy tắc
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationalListPanel>
  )
}

function CreateHint({
  canOpenAssistant,
  onOpenAssistant,
}: {
  readonly canOpenAssistant: boolean
  readonly onOpenAssistant: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-muted-foreground text-xs">Quy tắc được tạo bằng cách nhắn Kovia.</p>
      {canOpenAssistant ? (
        <Button type="button" size="sm" variant="outline" onClick={onOpenAssistant}>
          <Sparkles aria-hidden="true" />
          Mở Kovia
        </Button>
      ) : null}
    </div>
  )
}

function EmptyRules() {
  return (
    <div className="flex flex-col gap-3 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <Radar className="text-muted-foreground size-5" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Bạn chưa có quy tắc theo dõi nào</h3>
      </div>
      <p className="text-muted-foreground max-w-prose text-sm">
        Nhắn Kovia điều bạn muốn được báo. Kovia soạn quy tắc để bạn xác nhận, rồi tự kiểm tra định
        kỳ và gửi cảnh báo khi điều kiện xảy ra. Ví dụ:
      </p>
      <ul className="flex max-w-prose flex-col gap-1.5 text-sm">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt} className="bg-muted rounded-md px-3 py-2">
            “{prompt}”
          </li>
        ))}
      </ul>
    </div>
  )
}

function RuleItem({
  rule,
  isHighlighted,
  isPending,
  notice,
  onChangeStatus,
  onEvaluate,
  onDelete,
}: {
  readonly rule: WatchRule
  readonly isHighlighted: boolean
  readonly isPending: boolean
  readonly notice: RuleEvaluationNotice | null
  readonly onChangeStatus: (rule: WatchRule) => void
  readonly onEvaluate: (rule: WatchRule) => void
  readonly onDelete: (rule: WatchRule) => void
}) {
  const canToggle =
    rule.status === 'Active' || rule.status === 'Paused' || rule.status === 'Suspended'
  const itemRef = useRef<HTMLDivElement>(null)
  // Mở từ thông báo (?rule=…): đưa quy tắc được nhắc tới vào tầm nhìn một lần.
  useEffect(() => {
    if (isHighlighted) itemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isHighlighted])
  return (
    <Item
      ref={itemRef}
      aria-current={isHighlighted ? 'true' : undefined}
      className={cn(
        'flex-col items-stretch border-b sm:flex-row sm:items-start',
        isHighlighted && 'bg-primary/5 ring-primary ring-1 ring-inset'
      )}
    >
      <ItemContent className="min-w-0">
        <ItemTitle className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{rule.label}</span>
          <Badge variant={rule.status === 'Suspended' ? 'destructive' : 'outline'}>
            {RULE_STATUS_LABELS[rule.status] ?? rule.status}
          </Badge>
        </ItemTitle>
        <ItemDescription className="line-clamp-none">{rule.description}</ItemDescription>
        {rule.status === 'Suspended' && rule.statusReason ? (
          <p className="text-destructive text-xs font-medium">
            Lý do tạm ngưng: {rule.statusReason}
          </p>
        ) : rule.statusReason ? (
          <p className="text-muted-foreground text-xs">{rule.statusReason}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Kiểm tra gần nhất: {formatAlertTime(rule.lastEvaluatedAt)} · Lần khớp gần nhất:{' '}
          {formatAlertTime(rule.lastTriggeredAt)}
        </p>
        {rule.lastError ? (
          <p className="text-destructive text-xs">Lỗi lần kiểm tra trước: {rule.lastError}</p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className={cn(
              'text-xs font-medium',
              notice.isError ? 'text-destructive' : 'text-primary'
            )}
          >
            {notice.message}
          </p>
        ) : null}
      </ItemContent>
      <ItemActions className="flex-wrap">
        {canToggle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onChangeStatus(rule)}
          >
            {rule.status === 'Active' ? (
              <>
                <Pause aria-hidden="true" />
                Tạm dừng
              </>
            ) : (
              <>
                <Play aria-hidden="true" />
                Bật lại
              </>
            )}
          </Button>
        ) : null}
        {rule.status === 'Active' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onEvaluate(rule)}
          >
            Kiểm tra ngay
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          aria-label={`Xóa quy tắc ${rule.label}`}
          onClick={() => onDelete(rule)}
        >
          <Trash2 aria-hidden="true" />
          Xóa
        </Button>
      </ItemActions>
    </Item>
  )
}
