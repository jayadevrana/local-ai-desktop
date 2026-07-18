import { join } from 'node:path'

import { app, BrowserWindow, ipcMain, shell } from 'electron'

import { APP_NAME } from '@shared/defaults'
import type {
  AppSettings,
  ExportChatRequest,
  StartChatRequest,
  StreamEventEnvelope
} from '@shared/types'

import { AppService } from './services/app-service'
import { DiagnosticsService } from './services/diagnostics-service'
import { HistoryService } from './services/history-service'
import { LocalAiProvider } from './services/local-ai-provider'
import { ModelRegistryService } from './services/model-registry-service'
import { SettingsService } from './services/settings-service'

let mainWindow: BrowserWindow | null = null

const createServices = () => {
  const dataDir = join(app.getPath('userData'), 'local-ai')
  const settingsService = new SettingsService(dataDir)
  const diagnosticsService = new DiagnosticsService(dataDir)
  const provider = new LocalAiProvider(() => settingsService.getApiKey())
  const historyService = new HistoryService(dataDir)
  const modelRegistryService = new ModelRegistryService(dataDir, provider)

  return new AppService(
    settingsService,
    historyService,
    modelRegistryService,
    diagnosticsService,
    provider
  )
}

const appService = createServices()

const emitStreamEvent = (event: Electron.IpcMainInvokeEvent, envelope: StreamEventEnvelope) => {
  event.sender.send('local-ai:stream', envelope)
}

const registerIpc = () => {
  ipcMain.removeHandler('bootstrap:get')
  ipcMain.removeHandler('settings:update')
  ipcMain.removeHandler('settings:set-api-key')
  ipcMain.removeHandler('registry:refresh')
  ipcMain.removeHandler('registry:update-preference')
  ipcMain.removeHandler('threads:create')
  ipcMain.removeHandler('threads:rename')
  ipcMain.removeHandler('threads:toggle-pinned')
  ipcMain.removeHandler('threads:toggle-favorite')
  ipcMain.removeHandler('threads:delete')
  ipcMain.removeHandler('threads:clear')
  ipcMain.removeHandler('threads:export')
  ipcMain.removeHandler('diagnostics:clear')
  ipcMain.removeHandler('diagnostics:list')
  ipcMain.removeHandler('chat:start')
  ipcMain.removeHandler('chat:stop')

  ipcMain.handle('bootstrap:get', () => appService.bootstrap())
  ipcMain.handle('settings:update', (_, partial: Partial<AppSettings>) => appService.updateSettings(partial))
  ipcMain.handle(
    'settings:set-api-key',
    (_, payload: { apiKey: string | null; useEmbeddedKey: boolean }) =>
      appService.setApiKey(payload.apiKey, payload.useEmbeddedKey)
  )
  ipcMain.handle('registry:refresh', (_, force?: boolean) => appService.refreshRegistry(Boolean(force)))
  ipcMain.handle(
    'registry:update-preference',
    (_, payload: { modelId: string; patch: { favorited?: boolean; pinned?: boolean; routingPreference?: { mode: 'neutral' | 'boost' | 'avoid' } } }) =>
      appService.updateModelPreference(payload.modelId, payload.patch)
  )
  ipcMain.handle('threads:create', () => appService.createThread())
  ipcMain.handle('threads:rename', (_, payload: { threadId: string; title: string }) =>
    appService.renameThread(payload.threadId, payload.title)
  )
  ipcMain.handle('threads:toggle-pinned', (_, threadId: string) => appService.toggleThreadPinned(threadId))
  ipcMain.handle('threads:toggle-favorite', (_, threadId: string) =>
    appService.toggleThreadFavorite(threadId)
  )
  ipcMain.handle('threads:delete', (_, threadId: string) => appService.deleteThread(threadId))
  ipcMain.handle('threads:clear', () => appService.clearHistory())
  ipcMain.handle('threads:export', (_, payload: ExportChatRequest) => appService.exportThread(payload))
  ipcMain.handle('diagnostics:list', () => appService.bootstrap().then((payload) => payload.diagnostics))
  ipcMain.handle('diagnostics:clear', () => appService.clearDiagnostics())
  ipcMain.handle('chat:stop', (_, requestId: string) => appService.stopRequest(requestId))
  ipcMain.handle('chat:start', async (event, payload: StartChatRequest) => {
    void appService
      .startChat(payload, (envelope) => emitStreamEvent(event, envelope))
      .catch((error) => {
        emitStreamEvent(event, {
          requestId: payload.requestId,
          threadId: payload.threadId,
          type: 'message-error',
          payload: {
            message: error instanceof Error ? error.message : 'Request failed.'
          }
        })
      })

    return { accepted: true }
  })
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1200,
    minHeight: 780,
    backgroundColor: '#080d14',
    title: APP_NAME,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  app.setName(APP_NAME)
  registerIpc()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
