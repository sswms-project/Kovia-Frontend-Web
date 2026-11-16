import { CornerDownLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getQuickActions } from '../../utils/ai-suggested-prompts'
import { AI_ACTION_TILE_CLASS, AiActionTileBody } from './AiActionTile'
import { AiAssistantMascot } from './AiAssistantMascot'

interface AiSuggestedPromptsProps {
  readonly onSelect: (prompt: string) => void
}

const STAGGER_MS = 40

/** Màn hình chào khi chưa có tin nhắn: thao tác nhanh theo quyền thật của tài khoản và trang đang mở. */
export function AiSuggestedPrompts({ onSelect }: AiSuggestedPromptsProps) {
  const pathname = usePathname()
  const meQuery = useMeQuery()
  // Chưa có quyền thì chưa gợi ý gì, để không hiện thao tác người dùng không được làm.
  const actions = meQuery.data ? getQuickActions(pathname, meQuery.data.permissions) : []

  return (
    <div className="@container flex flex-col items-center gap-4 px-2 py-6 text-center">
      <AiAssistantMascot size="lg" />
      <div className="max-w-xs">
        <p className="text-sm font-semibold">Xin chào, mình là Kovia.</p>
        <p className="text-muted-foreground text-xs text-pretty">
          Mình chỉ đọc dữ liệu trong phạm vi quyền của tài khoản bạn. Mọi thay đổi đều cần bạn xác
          nhận.
        </p>
      </div>
      {actions.length > 0 ? (
        <ul className="grid w-full gap-2 @md:grid-cols-2" aria-label="Thao tác nhanh">
          {actions.map((action, index) => (
            <li
              key={action.id}
              data-ai-motion="card"
              style={{ animationDelay: `${index * STAGGER_MS}ms` }}
            >
              <button
                type="button"
                className={`${AI_ACTION_TILE_CLASS} h-full`}
                onClick={() => onSelect(action.prompt)}
              >
                <AiActionTileBody
                  icon={action.icon}
                  title={action.title}
                  trailingIcon={CornerDownLeft}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
