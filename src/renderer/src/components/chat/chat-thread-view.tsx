import { motion } from 'framer-motion'
import { Bot, Image as ImageIcon, User, Video } from 'lucide-react'

import type { ChatThread } from '@shared/types'

import { MessageMarkdown } from './message-markdown'

interface ChatThreadViewProps {
  thread: ChatThread | null
  assistantDraft: string
}

const roleIcon = {
  user: User,
  assistant: Bot,
  system: Bot
}

const modeIcon = {
  text: Bot,
  image: ImageIcon,
  video: Video
}

export const ChatThreadView = ({ thread, assistantDraft }: ChatThreadViewProps) => {
  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Local AI</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">A quiet workspace for serious prompting.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Start a new chat, paste context, or route an image or video prompt with the same workflow.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {thread.messages.map((message) => {
        const RoleIcon = roleIcon[message.role]
        const ModeIcon = modeIcon[message.mode]

        return (
          <motion.article
            key={message.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/[0.06] text-muted">
                  <RoleIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {message.role === 'user' ? 'You' : 'Local AI'}
                  </p>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                    <ModeIcon className="h-3 w-3" />
                    {message.mode}
                  </p>
                </div>
              </div>

              <p className="font-mono text-xs text-muted">{new Date(message.createdAt).toLocaleTimeString()}</p>
            </div>

            {message.text && <div className="mt-4"><MessageMarkdown content={message.text} /></div>}

            {message.assetUrl && message.mode === 'image' && (
              <img
                src={message.assetUrl}
                alt={message.text || 'Generated image'}
                className="mt-4 w-full rounded-[26px] border border-white/[0.08]"
              />
            )}

            {message.assetUrl && message.mode === 'video' && (
              <video
                src={message.assetUrl}
                controls
                playsInline
                preload="metadata"
                className="mt-4 w-full rounded-[26px] border border-white/[0.08]"
              />
            )}

            {message.routingDecision && (
              <p className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-muted">
                {message.routingDecision.reasoningSummary} Lane: {message.routingDecision.selectedLane}.
              </p>
            )}
          </motion.article>
        )
      })}

      {assistantDraft && (
        <motion.article
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.9 }}
          className="rounded-[30px] border border-primary/20 bg-primary/10 p-4"
        >
          <div className="flex items-center gap-2 text-sm text-primary">
            <Bot className="h-4 w-4" />
            Streaming response
          </div>
          <div className="mt-4">
            <MessageMarkdown content={assistantDraft} />
          </div>
        </motion.article>
      )}
    </div>
  )
}
