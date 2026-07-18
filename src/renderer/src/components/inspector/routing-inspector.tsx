import { useEffect, useState } from 'react'

import { Activity, CircleGauge, Cpu, Shield, TimerReset } from 'lucide-react'

import type { RoutingDecision, ThinkingState } from '@shared/types'

interface RoutingInspectorProps {
  thinking: ThinkingState
  routingDecision: RoutingDecision | null
  usage: Record<string, unknown> | null
  startedAt: number | null
}

export const RoutingInspector = ({
  thinking,
  routingDecision,
  usage,
  startedAt
}: RoutingInspectorProps) => {
  const [elapsedMs, setElapsedMs] = useState(thinking.elapsedMs)

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

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <Activity className="h-3.5 w-3.5" />
          Thinking summary
        </div>
        <p className="mt-3 text-lg font-medium text-white">{thinking.phaseLabel}</p>
        <p className="mt-2 text-sm leading-7 text-muted">{thinking.reasoningSummary}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Selected lane</p>
            <p className="mt-2 text-white">{routingDecision?.selectedLane ?? 'Routing pending'}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Elapsed</p>
            <p className="mt-2 text-white">
              {elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(3)}s`}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <CircleGauge className="h-3.5 w-3.5" />
          Router decision
        </div>
        {routingDecision ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white">{routingDecision.reasoningSummary}</p>
            <ul className="space-y-2 text-sm text-muted">
              {routingDecision.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Routing details will appear after the next request begins.
          </p>
        )}
      </section>

      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <Cpu className="h-3.5 w-3.5" />
          Runtime
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Network</p>
            <p className="mt-2 text-white">{thinking.networkStatus}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Usage estimate</p>
            <p className="mt-2 break-all text-white">{usage ? JSON.stringify(usage) : 'Pending'}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
              <Shield className="h-3.5 w-3.5" />
              Policy mode
            </p>
            <p className="mt-2 text-white">
              {routingDecision?.classification.allowLessRestrictive
                ? 'Freedom-first benign routing'
                : 'Balanced compliance routing'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
              <TimerReset className="h-3.5 w-3.5" />
              Fallback chain
            </p>
            <p className="mt-2 text-white">
              {routingDecision?.fallbackModelIds.length ? 'Prepared internally' : 'Pending'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
