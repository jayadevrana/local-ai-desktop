import type { IntentLane, ModelRegistrySnapshot } from '@shared/types'

const laneDescriptions: Record<IntentLane, string> = {
  uncensored: 'Creative freedom, direct tone, gritty dialogue, and benign high-expression prompts.',
  write: 'Writing, rewriting, style transfer, narrative work, and polished prose.',
  research: 'Analysis, research synthesis, comparison, summarization, and fact-heavy work.',
  learn: 'General learning, tutoring, translation, and balanced conversation.',
  build: 'Code generation, debugging, architecture, planning, and technical implementation.',
  image: 'Prompt-to-image generation with Local AI image models.',
  video: 'Prompt-to-video generation with Local AI video models.'
}

interface CapabilityViewProps {
  registry: ModelRegistrySnapshot
}

export const CapabilityView = ({ registry }: CapabilityViewProps) => {
  const textModels = registry.models.filter((model) => model.type === 'text').length
  const imageModels = registry.models.filter((model) => model.type === 'image').length
  const videoModels = registry.models.filter((model) => model.type === 'video').length

  const lanes: Array<{ lane: IntentLane; summary: string }> = [
    { lane: 'uncensored', summary: 'Prefers the most expressive compliant Local AI path for benign requests.' },
    { lane: 'write', summary: 'Prefers strongest writing-oriented reasoning path with tone fidelity.' },
    { lane: 'research', summary: 'Prefers deep reasoning and long-context research-capable path.' },
    { lane: 'learn', summary: 'Prefers balanced, teachable, lower-friction general assistance.' },
    { lane: 'build', summary: 'Prefers the strongest code and debugging path available.' },
    { lane: 'image', summary: 'Routes to the best available image generator.' },
    { lane: 'video', summary: 'Routes to the best available text-to-video model.' }
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Capability routing</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">User-facing lanes, internal model assignment.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
          The UI no longer exposes raw models. Users pick a capability lane and the router assigns the
          strongest internal model based on complexity, freedom preferences, latency, context needs, and fallback policy.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Text pool</p>
            <p className="mt-2 text-3xl text-white">{textModels}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Image pool</p>
            <p className="mt-2 text-3xl text-white">{imageModels}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Video pool</p>
            <p className="mt-2 text-3xl text-white">{videoModels}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lanes.map((entry) => (
          <section
            key={entry.lane}
            className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{entry.lane}</p>
            <p className="mt-3 text-base font-medium text-white">{entry.summary}</p>
            <p className="mt-3 text-sm leading-7 text-muted">{laneDescriptions[entry.lane]}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
