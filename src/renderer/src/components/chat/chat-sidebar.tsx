import { Search, Pin, Star, Trash2 } from 'lucide-react'

import type { ChatThread } from '@shared/types'

import { cn } from '@/utils/cn'

interface ChatSidebarProps {
  threads: ChatThread[]
  activeThreadId: string | null
  query: string
  onQueryChange: (value: string) => void
  onSelect: (threadId: string) => void
  onCreate: () => void
  onTogglePinned: (threadId: string) => void
  onToggleFavorite: (threadId: string) => void
  onDelete: (threadId: string) => void
}

export const ChatSidebar = ({
  threads,
  activeThreadId,
  query,
  onQueryChange,
  onSelect,
  onCreate,
  onTogglePinned,
  onToggleFavorite,
  onDelete
}: ChatSidebarProps) => (
  <aside className="flex min-h-0 flex-col gap-4">
    <button
      type="button"
      onClick={onCreate}
      className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary/85"
    >
      New chat
    </button>

    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search conversations"
        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-primary/35"
      />
    </label>

    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread.id)}
          className={cn(
            'group w-full rounded-3xl border p-3 text-left transition',
            thread.id === activeThreadId
              ? 'border-primary/30 bg-primary/10'
              : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{thread.title}</p>
              <p className="mt-1 text-xs text-muted">
                {thread.messages.length === 0 ? 'Empty chat' : `${thread.messages.length} messages`}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  onTogglePinned(thread.id)
                }}
                className={cn(
                  'rounded-full p-1.5 text-muted hover:bg-white/[0.08] hover:text-white',
                  thread.pinned && 'text-primary'
                )}
              >
                <Pin className="h-3.5 w-3.5" />
              </span>
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleFavorite(thread.id)
                }}
                className={cn(
                  'rounded-full p-1.5 text-muted hover:bg-white/[0.08] hover:text-white',
                  thread.favorite && 'text-accent'
                )}
              >
                <Star className="h-3.5 w-3.5" />
              </span>
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(thread.id)
                }}
                className="rounded-full p-1.5 text-muted hover:bg-white/[0.08] hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  </aside>
)
