import { create } from 'zustand'

import type {
  AppBootstrap,
  AppSettings,
  AppView,
  ChatMessage,
  ChatThread,
  DiagnosticLogEntry,
  IntentLane,
  ModelRegistrySnapshot,
  ModelType,
  RoutingDecision,
  StartChatRequest,
  StreamEventEnvelope,
  ThinkingState
} from '@shared/types'

const createRequestId = () =>
  `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

const defaultThinkingState: ThinkingState = {
  phase: 'idle',
  phaseLabel: 'Idle',
  reasoningSummary: 'Router diagnostics will appear here when you send a request.',
  selectedModelId: null,
  fallbackModelId: null,
  elapsedMs: 0,
  statusLine: 'Waiting for input',
  networkStatus: 'idle'
}

interface PendingRequestState {
  requestId: string | null
  assistantDraft: string
  usage: Record<string, unknown> | null
  startedAt: number | null
}

interface AppState {
  bootstrapped: boolean
  settings: AppSettings | null
  threads: ChatThread[]
  registry: ModelRegistrySnapshot | null
  diagnostics: DiagnosticLogEntry[]
  activeView: AppView
  activeThreadId: string | null
  sidebarQuery: string
  composerText: string
  selectedLane: IntentLane
  inspectorOpen: boolean
  thinking: ThinkingState
  routingDecision: RoutingDecision | null
  pending: PendingRequestState
  sendError: string | null
  bootstrap: () => Promise<void>
  handleStream: (event: StreamEventEnvelope) => void
  setActiveView: (view: AppView) => void
  setActiveThreadId: (threadId: string | null) => void
  setSidebarQuery: (query: string) => void
  setComposerText: (value: string) => void
  setSelectedLane: (lane: IntentLane) => void
  setInspectorOpen: (open: boolean) => void
  createThread: () => Promise<void>
  renameThread: (threadId: string, title: string) => Promise<void>
  toggleThreadPinned: (threadId: string) => Promise<void>
  toggleThreadFavorite: (threadId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  clearHistory: () => Promise<void>
  exportThread: (threadId: string, format: 'markdown' | 'json') => Promise<void>
  refreshRegistry: (force?: boolean) => Promise<void>
  updateModelPreference: (
    modelId: string,
    patch: { favorited?: boolean; pinned?: boolean; routingPreference?: { mode: 'neutral' | 'boost' | 'avoid' } }
  ) => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  setApiKey: (payload: { apiKey: string | null; useEmbeddedKey: boolean }) => Promise<void>
  clearDiagnostics: () => Promise<void>
  refreshDiagnostics: () => Promise<void>
  startRequest: () => Promise<void>
  stopRequest: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  bootstrapped: false,
  settings: null,
  threads: [],
  registry: null,
  diagnostics: [],
  activeView: 'chat',
  activeThreadId: null,
  sidebarQuery: '',
  composerText: '',
  selectedLane: 'learn',
  inspectorOpen: true,
  thinking: defaultThinkingState,
  routingDecision: null,
  pending: {
    requestId: null,
    assistantDraft: '',
    usage: null,
    startedAt: null
  },
  sendError: null,
  bootstrap: async () => {
    const payload: AppBootstrap = await window.localAI.bootstrap.get()
    set({
      bootstrapped: true,
      settings: payload.settings,
      threads: payload.threads,
      registry: payload.registry,
      diagnostics: payload.diagnostics,
      activeThreadId: payload.threads[0]?.id ?? null
    })
  },
  handleStream: (event) => {
    const refreshDiagnostics = () => {
      void window.localAI.diagnostics
        .list()
        .then((diagnostics) => set({ diagnostics }))
        .catch(() => undefined)
    }

    if (event.type === 'thinking') {
      set((current) => ({
        thinking: {
          ...current.thinking,
          phase: (event.payload.phase as ThinkingState['phase']) ?? current.thinking.phase,
          phaseLabel: String(event.payload.label ?? current.thinking.phaseLabel),
          reasoningSummary: String(event.payload.summary ?? current.thinking.reasoningSummary),
          selectedModelId: (event.payload.modelId as string | null | undefined) ?? current.thinking.selectedModelId,
          fallbackModelId:
            (event.payload.fallbackModelId as string | null | undefined) ?? current.thinking.fallbackModelId,
          statusLine: String(event.payload.label ?? current.thinking.statusLine),
          networkStatus:
            event.payload.phase === 'generating-answer'
              ? 'streaming'
              : event.payload.phase === 'error'
                ? 'error'
                : current.thinking.networkStatus,
          elapsedMs: current.pending.startedAt ? Date.now() - current.pending.startedAt : 0
        }
      }))
      return
    }

    if (event.type === 'routing') {
      set({
        routingDecision: event.payload as unknown as RoutingDecision
      })
      return
    }

    if (event.type === 'message-start') {
      const userMessage = event.payload.userMessage as ChatMessage
      set((current) => ({
        threads: current.threads.map((thread) =>
          thread.id === event.threadId ? { ...thread, messages: [...thread.messages, userMessage] } : thread
        )
      }))
      return
    }

    if (event.type === 'message-chunk') {
      set((current) => ({
        pending: {
          ...current.pending,
          assistantDraft:
            current.pending.requestId === event.requestId
              ? `${current.pending.assistantDraft}${String(event.payload.delta ?? '')}`
              : current.pending.assistantDraft
        }
      }))
      return
    }

    if (event.type === 'message-complete' || event.type === 'asset-complete') {
      const message = event.payload.message as ChatMessage
      set((current) => ({
        threads: current.threads.map((thread) =>
          thread.id === event.threadId ? { ...thread, messages: [...thread.messages, message], updatedAt: Date.now() } : thread
        ),
        pending: {
          requestId: null,
          assistantDraft: '',
          usage: (event.payload.usage as Record<string, unknown> | null | undefined) ?? null,
          startedAt: null
        },
        thinking: {
          ...current.thinking,
          phase: 'completed',
          phaseLabel: 'Completed',
          statusLine: 'Request completed',
          elapsedMs: current.pending.startedAt ? Date.now() - current.pending.startedAt : 0,
          networkStatus: 'success'
        }
      }))
      refreshDiagnostics()
      return
    }

    if (event.type === 'message-error' || event.type === 'stopped') {
      set((current) => ({
        sendError: String(event.payload.message ?? 'Request failed.'),
        pending: {
          requestId: null,
          assistantDraft: '',
          usage: null,
          startedAt: null
        },
        thinking: {
          ...current.thinking,
          phase: event.type === 'stopped' ? 'cancelled' : 'error',
          phaseLabel: event.type === 'stopped' ? 'Stopped' : 'Error',
          statusLine: String(event.payload.message ?? 'Request failed'),
          networkStatus: event.type === 'stopped' ? 'idle' : 'error'
        }
      }))
      refreshDiagnostics()
    }
  },
  setActiveView: (activeView) => set({ activeView }),
  setActiveThreadId: (activeThreadId) => set({ activeThreadId }),
  setSidebarQuery: (sidebarQuery) => set({ sidebarQuery }),
  setComposerText: (composerText) => set({ composerText }),
  setSelectedLane: (selectedLane) => set({ selectedLane }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  createThread: async () => {
    const threads = await window.localAI.threads.create()
    set({
      threads,
      activeThreadId: threads[0]?.id ?? null,
      composerText: '',
      sendError: null,
      activeView: 'chat'
    })
  },
  renameThread: async (threadId, title) => {
    const threads = await window.localAI.threads.rename({ threadId, title })
    set({ threads })
  },
  toggleThreadPinned: async (threadId) => {
    const threads = await window.localAI.threads.togglePinned(threadId)
    set({ threads })
  },
  toggleThreadFavorite: async (threadId) => {
    const threads = await window.localAI.threads.toggleFavorite(threadId)
    set({ threads })
  },
  deleteThread: async (threadId) => {
    const threads = await window.localAI.threads.remove(threadId)
    const nextActiveThreadId =
      get().activeThreadId === threadId ? threads[0]?.id ?? null : get().activeThreadId
    set({ threads, activeThreadId: nextActiveThreadId })
  },
  clearHistory: async () => {
    const threads = await window.localAI.threads.clear()
    set({ threads, activeThreadId: null })
  },
  exportThread: async (threadId, format) => {
    await window.localAI.threads.export({ threadId, format })
  },
  refreshRegistry: async (force = false) => {
    const registry = await window.localAI.registry.refresh(force)
    set({ registry })
  },
  updateModelPreference: async (modelId, patch) => {
    const registry = await window.localAI.registry.updatePreference({ modelId, patch })
    set({ registry })
  },
  updateSettings: async (partial) => {
    const settings = await window.localAI.settings.update(partial)
    set({ settings })
  },
  setApiKey: async (payload) => {
    const settings = await window.localAI.settings.setApiKey(payload)
    set({ settings })
  },
  clearDiagnostics: async () => {
    const diagnostics = await window.localAI.diagnostics.clear()
    set({ diagnostics })
  },
  refreshDiagnostics: async () => {
    const diagnostics = await window.localAI.diagnostics.list()
    set({ diagnostics })
  },
  startRequest: async () => {
    let state = get()
    const prompt = state.composerText.trim()

    if (!prompt || state.pending.requestId) {
      return
    }

    let threadId = state.activeThreadId

    if (!threadId) {
      const threads = await window.localAI.threads.create()
      threadId = threads[0]?.id ?? null
      set({
        threads,
        activeThreadId: threadId
      })
      state = get()
    }

    if (!threadId) {
      set({
        sendError: 'Unable to create a conversation. Try again.'
      })
      return
    }

    const requestId = createRequestId()
    const mode: ModelType =
      state.selectedLane === 'image' ? 'image' : state.selectedLane === 'video' ? 'video' : 'text'

    set({
      sendError: null,
      pending: {
        requestId,
        assistantDraft: '',
        usage: null,
        startedAt: Date.now()
      },
      composerText: '',
      thinking: {
        ...defaultThinkingState,
        phase: 'analyzing-request',
        phaseLabel: 'Analyzing request',
        statusLine: 'Preparing routing decision',
        networkStatus: 'idle'
      }
    })

    const payload: StartChatRequest = {
      threadId,
      requestId,
      prompt,
      mode,
      laneHint: state.selectedLane,
      manualModelId: null,
      manualRoutingOverride: false
    }

    try {
      await window.localAI.chat.start(payload)
    } catch (error) {
      set({
        sendError: error instanceof Error ? error.message : 'Request failed to start.',
        pending: {
          requestId: null,
          assistantDraft: '',
          usage: null,
          startedAt: null
        },
        thinking: {
          ...defaultThinkingState,
          phase: 'error',
          phaseLabel: 'Error',
          statusLine: 'Request failed before streaming started',
          networkStatus: 'error'
        }
      })
    }
  },
  stopRequest: async () => {
    const requestId = get().pending.requestId
    if (!requestId) {
      return
    }

    await window.localAI.chat.stop(requestId)
  }
}))
