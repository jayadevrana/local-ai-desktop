import type { KeyboardEvent } from 'react'

import { Square } from 'lucide-react'

import type { IntentLane } from '@shared/types'

import { cn } from '@/utils/cn'

interface ChatComposerProps {
  value: string
  selectedLane: IntentLane
  isSending: boolean
  canSend: boolean
  onChange: (value: string) => void
  onLaneChange: (lane: IntentLane) => void
  onSend: () => void
  onStop: () => void
}

const lanes: Array<{ value: IntentLane; label: string }> = [
  { value: 'uncensored', label: 'Uncensored' },
  { value: 'write', label: 'Write' },
  { value: 'research', label: 'Research' },
  { value: 'learn', label: 'Learn' },
  { value: 'build', label: 'Build' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' }
]

export const ChatComposer = ({
  value,
  selectedLane,
  isSending,
  canSend,
  onChange,
  onLaneChange,
  onSend,
  onStop
}: ChatComposerProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend()
      }
    }
  }

  return (
    <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-4 shadow-glass">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {lanes.map((lane) => (
          <button
            key={lane.value}
            type="button"
            onClick={() => onLaneChange(lane.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition',
              selectedLane === lane.value
                ? 'border-primary/35 bg-primary/15 text-primary'
                : 'border-white/[0.08] text-muted hover:border-white/[0.16] hover:text-white'
            )}
          >
            {lane.label}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write naturally. Local AI will infer complexity and auto-route the internal model for this lane."
        className="min-h-[120px] w-full resize-none bg-transparent text-[15px] leading-7 text-white outline-none placeholder:text-muted"
      />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
        <p className="text-xs text-muted">
          Enter sends. Shift+Enter adds a newline. Model assignment stays automatic and hidden.
        </p>

        {isSending ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/12 px-4 py-2 text-sm text-danger transition hover:bg-danger/18"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              canSend
                ? 'bg-primary text-white hover:bg-primary/85'
                : 'cursor-not-allowed bg-white/[0.08] text-muted'
            )}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
