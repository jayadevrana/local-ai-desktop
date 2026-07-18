import type { DiagnosticLogEntry } from '@shared/types'

interface DiagnosticsViewProps {
  diagnostics: DiagnosticLogEntry[]
  onClear: () => Promise<void>
}

export const DiagnosticsView = ({ diagnostics, onClear }: DiagnosticsViewProps) => (
  <div className="space-y-6">
    <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Diagnostics</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Router, provider, and system events.</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
        >
          Clear logs
        </button>
      </div>
    </section>

    <div className="space-y-3">
      {diagnostics.map((entry) => (
        <article
          key={entry.id}
          className="rounded-[26px] border border-white/[0.08] bg-white/[0.04] p-4"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted">
            <span>{entry.level}</span>
            <span>{entry.category}</span>
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-3 text-sm text-white">{entry.message}</p>
          {entry.details && (
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/20 p-3 text-xs leading-6 text-muted">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          )}
        </article>
      ))}
      {diagnostics.length === 0 && (
        <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.04] p-6 text-sm text-muted">
          No diagnostics yet. Router and provider events will accumulate here once requests start.
        </div>
      )}
    </div>
  </div>
)
