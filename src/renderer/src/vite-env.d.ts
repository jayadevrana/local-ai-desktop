/// <reference types="vite/client" />

import type {
  AppBootstrap,
  AppSettings,
  ExportChatRequest,
  StartChatRequest,
  StreamEventEnvelope
} from '@shared/types'

declare global {
  interface Window {
    localAI: {
      platform: string
      appName: string
      bootstrap: {
        get: () => Promise<AppBootstrap>
      }
      settings: {
        update: (partial: Partial<AppSettings>) => Promise<AppSettings>
        setApiKey: (payload: { apiKey: string | null; useEmbeddedKey: boolean }) => Promise<AppSettings>
      }
      registry: {
        refresh: (force?: boolean) => Promise<AppBootstrap['registry']>
        updatePreference: (payload: {
          modelId: string
          patch: { favorited?: boolean; pinned?: boolean; routingPreference?: { mode: 'neutral' | 'boost' | 'avoid' } }
        }) => Promise<AppBootstrap['registry']>
      }
      threads: {
        create: () => Promise<AppBootstrap['threads']>
        rename: (payload: { threadId: string; title: string }) => Promise<AppBootstrap['threads']>
        togglePinned: (threadId: string) => Promise<AppBootstrap['threads']>
        toggleFavorite: (threadId: string) => Promise<AppBootstrap['threads']>
        remove: (threadId: string) => Promise<AppBootstrap['threads']>
        clear: () => Promise<AppBootstrap['threads']>
        export: (payload: ExportChatRequest) => Promise<boolean>
      }
      diagnostics: {
        list: () => Promise<AppBootstrap['diagnostics']>
        clear: () => Promise<AppBootstrap['diagnostics']>
      }
      chat: {
        start: (payload: StartChatRequest) => Promise<AppBootstrap['threads']>
        stop: (requestId: string) => Promise<boolean>
        onStream: (listener: (event: StreamEventEnvelope) => void) => () => void
      }
    }
  }
}

export {}
