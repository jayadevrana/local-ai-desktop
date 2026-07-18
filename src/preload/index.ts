import { contextBridge, ipcRenderer } from 'electron'

import { APP_NAME } from '@shared/defaults'
import type {
  AppBootstrap,
  AppSettings,
  ExportChatRequest,
  StartChatRequest,
  StreamEventEnvelope
} from '@shared/types'

const localAiBridge = {
  platform: process.platform,
  appName: APP_NAME,
  bootstrap: {
    get: (): Promise<AppBootstrap> => ipcRenderer.invoke('bootstrap:get')
  },
  settings: {
    update: (partial: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', partial),
    setApiKey: (payload: { apiKey: string | null; useEmbeddedKey: boolean }) =>
      ipcRenderer.invoke('settings:set-api-key', payload)
  },
  registry: {
    refresh: (force = false) => ipcRenderer.invoke('registry:refresh', force),
    updatePreference: (payload: {
      modelId: string
      patch: { favorited?: boolean; pinned?: boolean; routingPreference?: { mode: 'neutral' | 'boost' | 'avoid' } }
    }) => ipcRenderer.invoke('registry:update-preference', payload)
  },
  threads: {
    create: () => ipcRenderer.invoke('threads:create'),
    rename: (payload: { threadId: string; title: string }) =>
      ipcRenderer.invoke('threads:rename', payload),
    togglePinned: (threadId: string) => ipcRenderer.invoke('threads:toggle-pinned', threadId),
    toggleFavorite: (threadId: string) => ipcRenderer.invoke('threads:toggle-favorite', threadId),
    remove: (threadId: string) => ipcRenderer.invoke('threads:delete', threadId),
    clear: () => ipcRenderer.invoke('threads:clear'),
    export: (payload: ExportChatRequest) => ipcRenderer.invoke('threads:export', payload)
  },
  diagnostics: {
    list: () => ipcRenderer.invoke('diagnostics:list'),
    clear: () => ipcRenderer.invoke('diagnostics:clear')
  },
  chat: {
    start: (payload: StartChatRequest) => ipcRenderer.invoke('chat:start', payload),
    stop: (requestId: string) => ipcRenderer.invoke('chat:stop', requestId),
    onStream: (listener: (event: StreamEventEnvelope) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: StreamEventEnvelope) =>
        listener(payload)
      ipcRenderer.on('local-ai:stream', handler)
      return () => {
        ipcRenderer.off('local-ai:stream', handler)
      }
    }
  }
}

contextBridge.exposeInMainWorld('localAI', localAiBridge)
