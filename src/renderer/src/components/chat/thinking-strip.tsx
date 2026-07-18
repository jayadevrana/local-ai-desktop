import { useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, BrainCircuit, Clock3, Radar, Sparkles } from 'lucide-react'

import type { RoutingDecision, ThinkingState } from '@shared/types'

import { cn } from '@/utils/cn'

interface ThinkingStripProps {
  thinking: ThinkingState
  routingDecision: RoutingDecision | null
  startedAt: number | null
  isActive: boolean
}

const phaseAccent: Record<ThinkingState['phase'], string> = {
  idle: 'text-muted border-white/[0.08] bg-white/[0.04]',
  'analyzing-request': 'text-primary border-primary/25 bg-primary/10',
  'estimating-complexity': 'text-primary border-primary/25 bg-primary/10',
  'selecting-model': 'text-secondary border-secondary/25 bg-secondary/10',
  'generating-answer': 'text-accent border-accent/25 bg-accent/10',
  'refining-output': 'text-white border-white/[0.18] bg-white/[0.08]',
  completed: 'text-success border-success/25 bg-success/10',
  error: 'text-danger border-danger/25 bg-danger/10',
  cancelled: 'text-warning border-warning/25 bg-warning/10'
}

export const ThinkingStrip = ({
  thinking,
  routingDecision,
  startedAt,
  isActive
}: ThinkingStripProps) => {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsedMs(thinking.elapsedMs)
      return
    }

    const update = () => {
      setElapsedMs(Date.now() - startedAt)
    }

    update()
    const interval = window.setInterval(update, 50)
    return () => window.clearInterval(interval)
  }, [startedAt, thinking.elapsedMs])

  const displayElapsed = useMemo(() => {
    const seconds = Math.floor(elapsedMs / 1000)
    const milliseconds = elapsedMs % 1000
    return seconds > 0 ? `${seconds}.${milliseconds.toString().padStart(3, '0')}s` : `${elapsedMs} ms`
  }, [elapsedMs])

  const shouldShow = isActive || thinking.phase !== 'idle'

  return (
    <AnimatePresence initial={false}>
      {shouldShow && (
        <motion.section
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="mb-4 overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.04] shadow-glass"
        >
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(122,162,255,0.7),transparent)]" />
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]',
                    phaseAccent[thinking.phase]
                  )}
                >
                  <Activity className={cn('h-3.5 w-3.5', isActive && 'animate-pulse')} />
                  {thinking.phaseLabel}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  {displayElapsed}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                  <Radar className="h-3.5 w-3.5" />
                  {thinking.networkStatus}
                </span>

                {routingDecision?.selectedLane && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                    <Sparkles className="h-3.5 w-3.5" />
                    {routingDecision.selectedLane}
                  </span>
                )}

                {thinking.selectedModelId && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    {thinking.selectedModelId}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Thinking summary</p>
                  <p className="mt-2 text-sm leading-7 text-white">{thinking.reasoningSummary}</p>
                  {routingDecision?.reasons?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {routingDecision.reasons.slice(0, 3).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs text-muted"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-white/[0.08] bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
                    <span>Status</span>
                    <span>{isActive ? 'Live' : 'Last run'}</span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(122,162,255,0.9),rgba(255,191,117,0.9),rgba(122,162,255,0.9))] bg-[length:200%_100%]"
                      animate={{
                        width: isActive ? ['18%', '64%', '38%'] : '100%',
                        backgroundPosition: isActive ? ['0% 0%', '100% 0%'] : '100% 0%'
                      }}
                      transition={{
                        width: { repeat: isActive ? Infinity : 0, duration: 1.8, ease: 'easeInOut' },
                        backgroundPosition: { repeat: isActive ? Infinity : 0, duration: 1.4, ease: 'linear' }
                      }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Phase</p>
                      <p className="mt-2 text-white">{thinking.statusLine}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Fallback</p>
                      <p className="mt-2 text-white">{thinking.fallbackModelId ?? 'Prepared internally'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
