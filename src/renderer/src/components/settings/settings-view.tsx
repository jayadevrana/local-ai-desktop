import { useMemo, useState } from 'react'

import type { AppSettings, CreativeFreedomMode, PreferenceMode, ToneProtection } from '@shared/types'

interface SettingsViewProps {
  settings: AppSettings
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>
  onSetApiKey: (payload: { apiKey: string | null; useEmbeddedKey: boolean }) => Promise<void>
  onClearHistory: () => Promise<void>
}

export const SettingsView = ({
  settings,
  onUpdate,
  onSetApiKey,
  onClearHistory
}: SettingsViewProps) => {
  const [apiKeyInput, setApiKeyInput] = useState('')

  const preferenceModes = useMemo<PreferenceMode[]>(
    () => ['speed', 'quality', 'cost', 'creativity', 'safety'],
    []
  )
  const creativeModes = useMemo<CreativeFreedomMode[]>(() => ['off', 'balanced', 'high'], [])
  const toneModes = useMemo<ToneProtection[]>(
    () => ['conservative', 'neutral', 'unfiltered'],
    []
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Provider access</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Local AI credential</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          The app ships with an embedded Local AI key and can also switch to a user-supplied key.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Provider key</span>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="Paste a replacement key"
              className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Active source</p>
            <p className="mt-3 text-lg text-white">
              {settings.provider.useEmbeddedKey ? 'Embedded Local AI key' : 'User-supplied key'}
            </p>
            <p className="mt-2 text-sm text-muted">
              Key present: {settings.provider.apiKeyPresent ? 'Yes' : 'No'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSetApiKey({ apiKey: apiKeyInput || null, useEmbeddedKey: false })}
                className="rounded-full bg-primary px-4 py-2 text-sm text-white transition hover:bg-primary/85"
              >
                Save custom key
              </button>
              <button
                type="button"
                onClick={() => onSetApiKey({ apiKey: null, useEmbeddedKey: true })}
                className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
              >
                Use embedded key
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Routing policy</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Default routing mode</span>
            <select
              value={settings.routing.defaultMode}
              onChange={(event) =>
                onUpdate({
                  routing: { ...settings.routing, defaultMode: event.target.value as PreferenceMode }
                })
              }
              className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            >
              {preferenceModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Creative Freedom Mode</span>
            <select
              value={settings.routing.creativeFreedomMode}
              onChange={(event) =>
                onUpdate({
                  routing: {
                    ...settings.routing,
                    creativeFreedomMode: event.target.value as CreativeFreedomMode
                  }
                })
              }
              className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            >
              {creativeModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-muted">Tone protection</span>
            <select
              value={settings.routing.toneProtection}
              onChange={(event) =>
                onUpdate({
                  routing: { ...settings.routing, toneProtection: event.target.value as ToneProtection }
                })
              }
              className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            >
              {toneModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-black/20 p-4">
            {[
              ['enableLessRestrictiveRouting', 'Enable less-restrictive routing'],
              ['neverAutoRouteToLessRestrictive', 'Never auto-route to less-restrictive'],
              ['askBeforeModelClassSwitch', 'Ask before switching classes'],
              ['preferToneFidelityOverSanitization', 'Prefer tone fidelity over sanitization']
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm text-white">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.routing[key as keyof typeof settings.routing])}
                  onChange={(event) =>
                    onUpdate({
                      routing: { ...settings.routing, [key]: event.target.checked }
                    })
                  }
                  className="h-4 w-4 accent-[rgb(var(--color-primary))]"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Client behavior</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ['streaming', 'Streaming'],
            ['animations', 'Animations'],
            ['compactMode', 'Compact mode'],
            ['showInspector', 'Show inspector'],
            ['verboseDiagnostics', 'Verbose diagnostics']
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-3xl border border-white/[0.08] bg-black/20 px-4 py-4 text-sm text-white"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings.features[key as keyof typeof settings.features])}
                onChange={(event) =>
                  onUpdate({
                    features: { ...settings.features, [key]: event.target.checked }
                  })
                }
                className="h-4 w-4 accent-[rgb(var(--color-primary))]"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-danger/20 bg-danger/10 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-danger">Maintenance</p>
        <p className="mt-2 text-sm text-white">
          Local data path: <span className="font-mono text-muted">{settings.storage.dataPath}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearHistory}
            className="rounded-full border border-danger/30 px-4 py-2 text-sm text-danger transition hover:bg-danger/16"
          >
            Clear history
          </button>
        </div>
      </section>
    </div>
  )
}
