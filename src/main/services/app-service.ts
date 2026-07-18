import type {
  AppBootstrap,
  AppSettings,
  ChatMessage,
  ChatThread,
  DiagnosticLogEntry,
  ExportChatRequest,
  ModelRegistrySnapshot,
  StartChatRequest,
  StreamEventEnvelope
} from '@shared/types'

import { createId } from '../lib/id'
import { DiagnosticsService } from './diagnostics-service'
import { HistoryService } from './history-service'
import { LocalAiProvider } from './local-ai-provider'
import { ModelRegistryService } from './model-registry-service'
import { buildRoutingDecision, evaluateModeration, getCleanPrompt, getPromptMode } from './router-engine'
import { SettingsService } from './settings-service'

const autoTitle = (prompt: string): string => {
  const compact = getCleanPrompt(prompt).replace(/\s+/g, ' ').trim()
  if (!compact) return 'New chat'
  return compact.length > 48 ? `${compact.slice(0, 48).trimEnd()}…` : compact
}

export class AppService {
  private readonly abortControllers = new Map<string, AbortController>()

  constructor(
    private readonly settingsService: SettingsService,
    private readonly historyService: HistoryService,
    private readonly registryService: ModelRegistryService,
    private readonly diagnostics: DiagnosticsService,
    private readonly provider: LocalAiProvider
  ) {}

  async bootstrap(): Promise<AppBootstrap> {
    const [settings, registry, diagnostics] = await Promise.all([
      this.settingsService.getSettings(),
      this.registryService.getSnapshot(),
      this.diagnostics.list()
    ])
    let threads = await this.historyService.listThreads()

    if (threads.length === 0) {
      await this.historyService.ensureThread()
      threads = await this.historyService.listThreads()
    }

    return {
      settings,
      threads,
      registry,
      diagnostics
    }
  }

  async refreshRegistry(force = false): Promise<ModelRegistrySnapshot> {
    return this.registryService.getSnapshot(force)
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const settings = await this.settingsService.updateSettings(partial)
    await this.diagnostics.log({
      level: 'info',
      category: 'settings',
      message: 'Updated app settings'
    })
    return settings
  }

  async setApiKey(apiKey: string | null, useEmbeddedKey: boolean): Promise<AppSettings> {
    const settings = await this.settingsService.setApiKey(apiKey, useEmbeddedKey)
    await this.diagnostics.log({
      level: 'info',
      category: 'settings',
      message: useEmbeddedKey ? 'Switched to embedded provider key' : 'Updated local provider key'
    })
    return settings
  }

  async createThread(): Promise<ChatThread[]> {
    await this.historyService.ensureThread()
    return this.historyService.listThreads()
  }

  async renameThread(threadId: string, title: string): Promise<ChatThread[]> {
    return this.historyService.renameThread(threadId, title)
  }

  async toggleThreadPinned(threadId: string): Promise<ChatThread[]> {
    return this.historyService.togglePinned(threadId)
  }

  async toggleThreadFavorite(threadId: string): Promise<ChatThread[]> {
    return this.historyService.toggleFavorite(threadId)
  }

  async deleteThread(threadId: string): Promise<ChatThread[]> {
    return this.historyService.deleteThread(threadId)
  }

  async clearHistory(): Promise<ChatThread[]> {
    await this.historyService.clearAll()
    return this.historyService.listThreads()
  }

  async exportThread(request: ExportChatRequest): Promise<boolean> {
    return this.historyService.exportThread(request)
  }

  async updateModelPreference(
    modelId: string,
    patch: Parameters<ModelRegistryService['updateModelPreference']>[1]
  ): Promise<ModelRegistrySnapshot> {
    return this.registryService.updateModelPreference(modelId, patch)
  }

  async clearDiagnostics(): Promise<DiagnosticLogEntry[]> {
    await this.diagnostics.clear()
    return this.diagnostics.list()
  }

  stopRequest(requestId: string): boolean {
    const controller = this.abortControllers.get(requestId)
    if (!controller) {
      return false
    }

    controller.abort()
    this.abortControllers.delete(requestId)
    return true
  }

  async startChat(
    request: StartChatRequest,
    emit: (event: StreamEventEnvelope) => void
  ): Promise<ChatThread[]> {
    try {
      const settings = await this.settingsService.getSettings()
      const registry = await this.registryService.getSnapshot()
      const threads = await this.historyService.listThreads()
      const currentThread =
        threads.find((thread) => thread.id === request.threadId) ??
        (await this.historyService.ensureThread(request.threadId))

      const mode = request.mode === 'text' ? getPromptMode(request.prompt) : request.mode
      const prompt = getCleanPrompt(request.prompt)
      const moderationDecision = evaluateModeration(prompt)

      if (moderationDecision === 'block') {
        const errorMessage =
          'This request crosses the hard policy boundary for clearly dangerous or illegal content.'
        emit({
          requestId: request.requestId,
          threadId: currentThread.id,
          type: 'message-error',
          payload: { message: errorMessage }
        })
        return threads
      }

      emit({
        requestId: request.requestId,
        threadId: currentThread.id,
        type: 'thinking',
        payload: {
          phase: 'analyzing-request',
          label: 'Analyzing request',
          summary: 'Inspecting task type, prompt mode, tone requirements, and routing preferences.'
        }
      })

      emit({
        requestId: request.requestId,
        threadId: currentThread.id,
        type: 'thinking',
        payload: {
          phase: 'estimating-complexity',
          label: 'Estimating complexity',
          summary: 'Scoring complexity, context needs, urgency, and creative freedom before model selection.'
        }
      })

      const routingDecision = buildRoutingDecision({
        prompt,
        mode,
        registry,
        preferences: settings.routing,
        requestId: request.requestId,
        laneHint: request.laneHint ?? null,
        manualModelId: request.manualRoutingOverride ? request.manualModelId : null,
        thread: currentThread
      })

      emit({
        requestId: request.requestId,
        threadId: currentThread.id,
        type: 'routing',
        payload: routingDecision as unknown as Record<string, unknown>
      })

      await this.diagnostics.log({
        level: 'info',
        category: 'router',
        message: 'Created routing decision',
        details: routingDecision as unknown as Record<string, unknown>
      })

      const userMessage: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        mode,
        text: prompt,
        createdAt: Date.now(),
        attachments: request.attachments
      }

      const updatedThread: ChatThread = {
        ...currentThread,
        title: currentThread.messages.length === 0 ? autoTitle(prompt) : currentThread.title,
        updatedAt: Date.now(),
        messages: [...currentThread.messages, userMessage]
      }

      await this.historyService.upsertThread(updatedThread)

      emit({
        requestId: request.requestId,
        threadId: currentThread.id,
        type: 'message-start',
        payload: {
          userMessage
        }
      })

      const controller = new AbortController()
      this.abortControllers.set(request.requestId, controller)

      emit({
        requestId: request.requestId,
        threadId: updatedThread.id,
        type: 'thinking',
        payload: {
          phase: 'selecting-model',
          label: 'Selecting model',
          summary: routingDecision.reasoningSummary,
          modelId: routingDecision.selectedModelId,
          fallbackModelId: routingDecision.fallbackModelIds[0] ?? null
        }
      })

      if (mode === 'image') {
        emit({
          requestId: request.requestId,
          threadId: updatedThread.id,
          type: 'thinking',
          payload: {
            phase: 'generating-answer',
            label: 'Generating image',
            summary: 'Rendering prompt output with the selected image model.'
          }
        })

        const assetUrl = await this.provider.generateImage(
          routingDecision.selectedModelId,
          prompt,
          controller.signal
        )

        const assistantMessage: ChatMessage = {
          id: createId('msg'),
          role: 'assistant',
          mode,
          text: 'Image generated successfully.',
          createdAt: Date.now(),
          modelId: routingDecision.selectedModelId,
          routingDecision,
          reasoningSummary: routingDecision.reasoningSummary,
          assetUrl
        }

        await this.historyService.upsertThread({
          ...updatedThread,
          updatedAt: Date.now(),
          messages: [...updatedThread.messages, assistantMessage]
        })

        emit({
          requestId: request.requestId,
          threadId: updatedThread.id,
          type: 'asset-complete',
          payload: { message: assistantMessage }
        })

        return this.historyService.listThreads()
      }

      if (mode === 'video') {
        emit({
          requestId: request.requestId,
          threadId: updatedThread.id,
          type: 'thinking',
          payload: {
            phase: 'generating-answer',
            label: 'Generating video',
            summary: 'Queueing video generation and waiting for the selected model to finish rendering.'
          }
        })

        const assetUrl = await this.provider.generateVideo(
          routingDecision.selectedModelId,
          prompt,
          controller.signal
        )

        const assistantMessage: ChatMessage = {
          id: createId('msg'),
          role: 'assistant',
          mode,
          text: 'Video generated successfully.',
          createdAt: Date.now(),
          modelId: routingDecision.selectedModelId,
          routingDecision,
          reasoningSummary: routingDecision.reasoningSummary,
          assetUrl
        }

        await this.historyService.upsertThread({
          ...updatedThread,
          updatedAt: Date.now(),
          messages: [...updatedThread.messages, assistantMessage]
        })

        emit({
          requestId: request.requestId,
          threadId: updatedThread.id,
          type: 'asset-complete',
          payload: { message: assistantMessage }
        })

        return this.historyService.listThreads()
      }

      emit({
        requestId: request.requestId,
        threadId: updatedThread.id,
        type: 'thinking',
        payload: {
          phase: 'generating-answer',
          label: 'Streaming response',
          summary: 'Receiving the answer in real time.'
        }
      })

      const assistantMessageId = createId('msg')
      let finalText = ''
      let usage: Record<string, unknown> | undefined

      await this.provider.streamText({
        modelId: routingDecision.selectedModelId,
        messages: updatedThread.messages.map((message) => ({
          role: message.role === 'system' ? 'system' : message.role,
          content: message.text
        })),
        signal: controller.signal,
        onChunk: (chunk) => {
          if (chunk.delta) {
            finalText += chunk.delta
            emit({
              requestId: request.requestId,
              threadId: updatedThread.id,
              type: 'message-chunk',
              payload: {
                messageId: assistantMessageId,
                delta: chunk.delta
              }
            })
          }

          if (chunk.usage) {
            usage = chunk.usage
          }
        }
      })

      emit({
        requestId: request.requestId,
        threadId: updatedThread.id,
        type: 'thinking',
        payload: {
          phase: 'refining-output',
          label: 'Refining output',
          summary: 'Finalizing the streamed answer and storing diagnostics.'
        }
      })

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        mode,
        text: finalText.trim(),
        createdAt: Date.now(),
        modelId: routingDecision.selectedModelId,
        routingDecision,
        reasoningSummary: routingDecision.reasoningSummary
      }

      await this.historyService.upsertThread({
        ...updatedThread,
        updatedAt: Date.now(),
        messages: [...updatedThread.messages, assistantMessage]
      })

      emit({
        requestId: request.requestId,
        threadId: updatedThread.id,
        type: 'message-complete',
        payload: {
          message: assistantMessage,
          usage: usage ?? null
        }
      })

      return this.historyService.listThreads()
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Generation stopped.'
          : error instanceof Error
            ? error.message
            : 'Request failed.'

      const threadId = request.threadId

      await this.diagnostics.log({
        level: 'error',
        category: 'chat',
        message: 'Request failed',
        details: {
          requestId: request.requestId,
          error: message
        }
      })

      emit({
        requestId: request.requestId,
        threadId,
        type: error instanceof Error && error.name === 'AbortError' ? 'stopped' : 'message-error',
        payload: { message }
      })
      this.abortControllers.delete(request.requestId)

      return this.historyService.listThreads()
    } finally {
      this.abortControllers.delete(request.requestId)
    }
  }
}
