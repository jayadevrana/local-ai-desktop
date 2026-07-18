import { useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Box,
  Download,
  Logs,
  MessageSquare,
  PanelRight,
  Settings as SettingsIcon
} from 'lucide-react'

import type { ChatMessage } from '@shared/types'

import { ErrorBoundary } from '@/components/common/error-boundary'
import { ChatComposer } from '@/components/chat/chat-composer'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatThreadView } from '@/components/chat/chat-thread-view'
import { ThinkingStrip } from '@/components/chat/thinking-strip'
import { DiagnosticsView } from '@/components/diagnostics/diagnostics-view'
import { RoutingInspector } from '@/components/inspector/routing-inspector'
import { CapabilityView } from '@/components/models/capability-view'
import { SettingsView } from '@/components/settings/settings-view'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/utils/cn'

const navItems = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'models', label: 'Capabilities', icon: Box },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'diagnostics', label: 'Diagnostics', icon: Logs }
] as const

const AppShell = () => {
  const [draftTitle, setDraftTitle] = useState('')
  const {
    bootstrapped,
    settings,
    threads,
    registry,
    diagnostics,
    activeView,
    activeThreadId,
    sidebarQuery,
    composerText,
    selectedLane,
    inspectorOpen,
    thinking,
    routingDecision,
    pending,
    sendError,
    bootstrap,
    handleStream,
    setActiveView,
    setActiveThreadId,
    setSidebarQuery,
    setComposerText,
    setSelectedLane,
    setInspectorOpen,
    createThread,
    renameThread,
    toggleThreadPinned,
    toggleThreadFavorite,
    deleteThread,
    clearHistory,
    exportThread,
    updateSettings,
    setApiKey,
    clearDiagnostics,
    startRequest,
    stopRequest
  } = useAppStore()

  useEffect(() => {
    void bootstrap()
    return window.localAI.chat.onStream(handleStream)
  }, [bootstrap, handleStream])

  const filteredThreads = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase()
    if (!query) return threads
    return threads.filter((thread) => {
      const haystack = [thread.title, ...thread.messages.map((message: ChatMessage) => message.text)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [sidebarQuery, threads])

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null

  useEffect(() => {
    setDraftTitle(activeThread?.title ?? '')
  }, [activeThread?.title])

  useEffect(() => {
    if (composerText === '/settings') {
      setComposerText('')
      setActiveView('settings')
    }
    if (composerText === '/diagnostics') {
      setComposerText('')
      setActiveView('diagnostics')
    }
    if (composerText === '/new') {
      setComposerText('')
      void createThread()
    }
  }, [composerText, createThread, setActiveView, setComposerText])

  if (!bootstrapped || !settings || !registry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10 text-ink">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[36px] border border-white/[0.08] bg-white/[0.04] px-8 py-7 text-center shadow-glass"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Local AI</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Preparing your workspace</h1>
          <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-1/2 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] bg-[length:200%_100%]" />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas px-5 py-5 text-ink">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(86,132,220,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(87,186,255,0.08),transparent_24%)]" />

      <div className="mx-auto grid h-[calc(100vh-2.5rem)] max-w-[1680px] grid-cols-[300px_minmax(0,1fr)] gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="flex min-h-0 flex-col rounded-[36px] border border-white/[0.08] bg-panel/80 p-4 shadow-glass backdrop-blur-2xl">
          <div className="mb-4 border-b border-white/[0.08] pb-4">
            <p className="text-xs uppercase tracking-[0.28em] text-primary/80">Local AI</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Desktop workspace</h1>
          </div>

          <ChatSidebar
            threads={filteredThreads}
            activeThreadId={activeThreadId}
            query={sidebarQuery}
            onQueryChange={setSidebarQuery}
            onSelect={setActiveThreadId}
            onCreate={() => void createThread()}
            onTogglePinned={(threadId) => void toggleThreadPinned(threadId)}
            onToggleFavorite={(threadId) => void toggleThreadFavorite(threadId)}
            onDelete={(threadId) => void deleteThread(threadId)}
          />
        </aside>

        <main className="flex min-h-0 flex-col rounded-[36px] border border-white/[0.08] bg-panel/80 p-4 shadow-glass backdrop-blur-2xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Focused desktop AI</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                {activeView === 'chat'
                  ? activeThread?.title ?? 'New chat'
                  : activeView === 'models'
                    ? 'Capability routing'
                    : activeView === 'settings'
                      ? 'Settings'
                      : 'Diagnostics'}
              </h2>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                      activeView === item.id
                        ? 'border-primary/35 bg-primary/15 text-primary'
                        : 'border-white/[0.08] text-muted hover:border-white/[0.16] hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </header>

          {activeView === 'chat' && (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] py-4">
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={() => activeThread && void renameThread(activeThread.id, draftTitle)}
                  className="min-w-0 flex-1 bg-transparent text-lg font-medium text-white outline-none"
                />
                {activeThread && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void exportThread(activeThread.id, 'markdown')}
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-2 text-sm text-white transition hover:bg-white/[0.06]"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorOpen(!inspectorOpen)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-2 text-sm text-white transition hover:bg-white/[0.06]"
                    >
                      <PanelRight className="h-4 w-4" />
                      Inspector
                    </button>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col pt-4">
                <div className="flex-1 overflow-y-auto pr-2">
                  <ThinkingStrip
                    thinking={thinking}
                    routingDecision={routingDecision}
                    startedAt={pending.startedAt}
                    isActive={Boolean(pending.requestId)}
                  />
                  <ChatThreadView thread={activeThread} assistantDraft={pending.assistantDraft} />
                </div>

                {sendError && (
                  <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {sendError}
                  </div>
                )}

                <div className="mt-4">
                  <ChatComposer
                    value={composerText}
                    selectedLane={selectedLane}
                    isSending={Boolean(pending.requestId)}
                    canSend={Boolean(composerText.trim())}
                    onChange={setComposerText}
                    onLaneChange={setSelectedLane}
                    onSend={() => void startRequest()}
                    onStop={() => void stopRequest()}
                  />
                </div>
              </div>
            </>
          )}

          {activeView === 'models' && (
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <CapabilityView registry={registry} />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <SettingsView
                settings={settings}
                onUpdate={updateSettings}
                onSetApiKey={setApiKey}
                onClearHistory={clearHistory}
              />
            </div>
          )}

          {activeView === 'diagnostics' && (
            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
              <DiagnosticsView diagnostics={diagnostics} onClear={clearDiagnostics} />
            </div>
          )}
        </main>

        <AnimatePresence initial={false}>
          {settings.features.showInspector && inspectorOpen && activeView === 'chat' && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
              className="hidden min-h-0 rounded-[36px] border border-white/[0.08] bg-panel/80 p-4 shadow-glass backdrop-blur-2xl xl:block"
            >
              <div className="h-full overflow-y-auto pr-2">
                <RoutingInspector
                  thinking={{
                    ...thinking,
                    elapsedMs: pending.startedAt ? Date.now() - pending.startedAt : thinking.elapsedMs
                  }}
                  routingDecision={routingDecision}
                  usage={pending.usage}
                  startedAt={pending.startedAt}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const App = () => (
  <ErrorBoundary>
    <AppShell />
  </ErrorBoundary>
)

export default App
