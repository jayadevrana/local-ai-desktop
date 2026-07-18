import { useState } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/utils/cn'

interface MessageMarkdownProps {
  content: string
}

export const MessageMarkdown = ({ content }: MessageMarkdownProps) => {
  const [copied, setCopied] = useState<string | null>(null)

  return (
    <div className="prose prose-invert max-w-none prose-pre:my-0 prose-pre:bg-transparent prose-code:text-ink prose-p:text-ink prose-headings:text-white prose-strong:text-white prose-li:text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props
            const raw = String(children).replace(/\n$/, '')
            const isBlock = Boolean(className)

            if (!isBlock) {
              return <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[0.92em]">{raw}</code>
            }

            return (
              <div className="my-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/30">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    {(className ?? '').replace('language-', '')}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(raw)
                      setCopied(raw)
                      window.setTimeout(() => setCopied(null), 1200)
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] transition',
                      copied === raw
                        ? 'border-primary/30 bg-primary/15 text-primary'
                        : 'border-white/[0.08] text-muted hover:border-white/[0.16] hover:text-white'
                    )}
                  >
                    {copied === raw ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-ink">
                  <code className={className ?? ''}>{raw}</code>
                </pre>
              </div>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
