import {
  LOCAL_AI_BASE_URL,
  PROVIDER_LABEL
} from '@shared/defaults'
import type { LocalAiModel, ModelRegistrySnapshot, ModelType } from '@shared/types'

type RawModelType =
  | ModelType
  | 'asr'
  | 'embedding'
  | 'music'
  | 'tts'
  | 'upscale'
  | 'inpaint'

type RawModel = {
  created?: number
  id: string
  type: RawModelType
  model_spec?: {
    name?: string
    description?: string
    availableContextTokens?: number
    maxCompletionTokens?: number
    capabilities?: {
      optimizedForCode?: boolean
      supportsFunctionCalling?: boolean
      supportsReasoning?: boolean
      supportsReasoningEffort?: boolean
      supportsVision?: boolean
      supportsAudioInput?: boolean
      supportsVideoInput?: boolean
      supportsWebSearch?: boolean
      supportsResponseSchema?: boolean
    }
    pricing?: {
      input?: { usd?: number }
      output?: { usd?: number }
      cache_input?: { usd?: number }
    }
    privacy?: string
    traits?: string[]
    model_sets?: string[]
  }
}

const supportedModelTypes = new Set<ModelType>(['text', 'image', 'video'])

type RawDefaults = {
  data?: {
    default?: string
    most_intelligent?: string
    default_code?: string
    default_reasoning?: string
    most_uncensored?: string
  }
}

const mapTags = (raw: RawModel): LocalAiModel['tags'] => {
  const id = raw.id.toLowerCase()
  const description = raw.model_spec?.description?.toLowerCase() ?? ''
  const tags = new Set<LocalAiModel['tags'][number]>(['general'])

  if (raw.model_spec?.capabilities?.optimizedForCode || /coder|code/.test(id)) {
    tags.add('coding')
  }

  if (raw.model_spec?.capabilities?.supportsReasoning || /thinking|reason|glm|r1/.test(id)) {
    tags.add('reasoning')
  }

  if (raw.type !== 'text' || /creative|story|image|video|flux|dream|imagine/.test(id)) {
    tags.add('creative')
  }

  if (/uncensored|unfiltered/.test(id) || /uncensored|unfiltered/.test(description)) {
    tags.add('less_restrictive')
  } else {
    tags.add('safety_hardened')
  }

  return [...tags]
}

const classifySpeed = (raw: RawModel): LocalAiModel['speedClass'] => {
  const id = raw.id.toLowerCase()
  const ctx = raw.model_spec?.availableContextTokens ?? 0
  if (/mini|turbo|fast|4b|8b|9b|lite/.test(id)) {
    return 'fast'
  }
  if (ctx > 180_000 || /480b|235b|70b/.test(id)) {
    return 'slow'
  }
  return 'balanced'
}

const classifyReasoning = (raw: RawModel): LocalAiModel['reasoningClass'] => {
  const id = raw.id.toLowerCase()
  if (/480b|235b|thinking|glm-5-1|intelligent/.test(id)) {
    return 'strong'
  }
  if (raw.model_spec?.capabilities?.supportsReasoning) {
    return 'balanced'
  }
  return 'light'
}

const classifyCreativity = (raw: RawModel): LocalAiModel['creativityClass'] => {
  const id = raw.id.toLowerCase()
  if (/uncensored|imagine|dream|flux|seed/.test(id)) {
    return 'expressive'
  }
  if (/coder|reason/.test(id)) {
    return 'guarded'
  }
  return 'balanced'
}

const classifySafety = (raw: RawModel): LocalAiModel['safetyClass'] => {
  const tags = mapTags(raw)
  if (tags.includes('less_restrictive')) {
    return 'less-restrictive'
  }
  return tags.includes('safety_hardened') ? 'safety-hardened' : 'balanced'
}

const toModel = (raw: RawModel & { type: ModelType }, existing?: LocalAiModel): LocalAiModel => ({
  id: raw.id,
  provider: 'local-ai',
  name: raw.model_spec?.name ?? raw.id,
  type: raw.type,
  description: raw.model_spec?.description ?? `${PROVIDER_LABEL} ${raw.type} model`,
  created: raw.created ?? null,
  availableContextTokens: raw.model_spec?.availableContextTokens ?? null,
  maxCompletionTokens: raw.model_spec?.maxCompletionTokens ?? null,
  capabilities: {
    optimizedForCode: Boolean(raw.model_spec?.capabilities?.optimizedForCode),
    supportsFunctionCalling: Boolean(raw.model_spec?.capabilities?.supportsFunctionCalling),
    supportsReasoning: Boolean(raw.model_spec?.capabilities?.supportsReasoning),
    supportsReasoningEffort: Boolean(raw.model_spec?.capabilities?.supportsReasoningEffort),
    supportsVision: Boolean(raw.model_spec?.capabilities?.supportsVision),
    supportsAudioInput: Boolean(raw.model_spec?.capabilities?.supportsAudioInput),
    supportsVideoInput: Boolean(raw.model_spec?.capabilities?.supportsVideoInput),
    supportsWebSearch: Boolean(raw.model_spec?.capabilities?.supportsWebSearch),
    supportsResponseSchema: Boolean(raw.model_spec?.capabilities?.supportsResponseSchema)
  },
  pricing: {
    input: raw.model_spec?.pricing?.input?.usd ?? null,
    output: raw.model_spec?.pricing?.output?.usd ?? null,
    cacheInput: raw.model_spec?.pricing?.cache_input?.usd ?? null
  },
  privacy: raw.model_spec?.privacy ?? null,
  traits: raw.model_spec?.traits ?? [],
  tags: mapTags(raw),
  speedClass: classifySpeed(raw),
  reasoningClass: classifyReasoning(raw),
  creativityClass: classifyCreativity(raw),
  safetyClass: classifySafety(raw),
  favorited: existing?.favorited ?? false,
  pinned: existing?.pinned ?? false,
  routingPreference: existing?.routingPreference ?? { mode: 'neutral' }
})

const parseSseBlocks = (
  buffer: string
): {
  blocks: string[]
  rest: string
} => {
  const parts = buffer.split('\n\n')
  if (parts.length === 1) {
    return { blocks: [], rest: buffer }
  }

  return {
    blocks: parts.slice(0, -1),
    rest: parts.at(-1) ?? ''
  }
}

export class LocalAiProvider {
  constructor(private readonly getApiKey: () => Promise<string>) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const apiKey = await this.getApiKey()
    return fetch(`${LOCAL_AI_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })
  }

  async validateKey(): Promise<boolean> {
    const response = await this.request('/models/traits')
    return response.ok
  }

  async fetchRegistry(existingModels: LocalAiModel[] = []): Promise<ModelRegistrySnapshot> {
    const [modelsResponse, defaultsResponse] = await Promise.all([
      this.request('/models?type=all'),
      this.request('/models/traits')
    ])

    const modelsPayload = (await modelsResponse.json()) as { data?: RawModel[]; error?: { message?: string } }
    if (!modelsResponse.ok) {
      throw new Error(modelsPayload.error?.message ?? 'Failed to load models.')
    }

    const defaultsPayload = (await defaultsResponse.json()) as RawDefaults
    const nextModels = (modelsPayload.data ?? [])
      .filter((raw): raw is RawModel & { type: ModelType } =>
        supportedModelTypes.has(raw.type as ModelType)
      )
      .map((raw) => toModel(raw, existingModels.find((item) => item.id === raw.id)))

    return {
      models: nextModels,
      defaults: {
        default: defaultsPayload.data?.default ?? null,
        mostIntelligent: defaultsPayload.data?.most_intelligent ?? null,
        defaultCode: defaultsPayload.data?.default_code ?? null,
        defaultReasoning: defaultsPayload.data?.default_reasoning ?? null,
        mostExpressive: defaultsPayload.data?.most_uncensored ?? null
      },
      lastUpdatedAt: Date.now(),
      stale: false
    }
  }

  async streamText(params: {
    modelId: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    onChunk: (event: { delta?: string; done?: boolean; usage?: Record<string, unknown> }) => void
    signal: AbortSignal
  }): Promise<void> {
    const modelId = params.modelId.includes(':')
      ? params.modelId
      : `${params.modelId}:strip_thinking_response=true`

    const response = await this.request('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: params.messages,
        venice_parameters: {
          disable_thinking: true,
          strip_thinking_response: true
        }
      }),
      signal: params.signal
    })

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}))
      throw new Error((payload as { error?: { message?: string } }).error?.message ?? 'Local AI request failed.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let sawVisibleContent = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const { blocks, rest } = parseSseBlocks(buffer)
      buffer = rest

      for (const block of blocks) {
        const line = block
          .split('\n')
          .find((entry) => entry.startsWith('data: '))

        if (!line) {
          continue
        }

        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          params.onChunk({ done: true })
          continue
        }

        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>
          usage?: Record<string, unknown>
        }
        const delta = parsed.choices?.[0]?.delta?.content

        if (typeof delta === 'string') {
          sawVisibleContent = sawVisibleContent || delta.trim().length > 0
          params.onChunk({ delta })
        }

        if (parsed.usage) {
          params.onChunk({ usage: parsed.usage })
        }
      }
    }

    if (!sawVisibleContent && !params.signal.aborted) {
      throw new Error('The provider returned no visible output for this request. Please try again.')
    }
  }

  async generateImage(modelId: string, prompt: string, signal: AbortSignal): Promise<string> {
    const response = await this.request('/image/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        prompt,
        return_binary: false,
        safe_mode: false,
        format: 'png',
        resolution: '1K',
        aspect_ratio: '1:1',
        variants: 1
      }),
      signal
    })
    const payload = (await response.json()) as {
      images?: Array<string | { base64?: string; b64_json?: string }>
      error?: { message?: string }
    }

    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Image generation failed.')
    }

    const firstImage = payload.images?.[0]
    const base64 =
      typeof firstImage === 'string'
        ? firstImage
        : firstImage?.base64 ?? firstImage?.b64_json ?? null

    if (!base64) {
      throw new Error('Image generation returned no image.')
    }

    return `data:image/png;base64,${base64}`
  }

  async generateVideo(modelId: string, prompt: string, signal: AbortSignal): Promise<string> {
    const queueResponse = await this.request('/video/queue', {
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        prompt,
        duration: '5s',
        resolution: '480p',
        aspect_ratio: '16:9'
      }),
      signal
    })

    const queuePayload = (await queueResponse.json()) as {
      queue_id?: string
      error?: { message?: string }
    }

    if (!queueResponse.ok || !queuePayload.queue_id) {
      throw new Error(queuePayload.error?.message ?? 'Video generation queue failed.')
    }

    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 4000))

      const retrieveResponse = await this.request('/video/retrieve', {
        method: 'POST',
        body: JSON.stringify({ queue_id: queuePayload.queue_id }),
        signal
      })

      const contentType = retrieveResponse.headers.get('content-type') ?? ''
      if (contentType.includes('video/mp4')) {
        const bytes = Buffer.from(await retrieveResponse.arrayBuffer())
        const outputPath = join(tmpdir(), `local-ai-${queuePayload.queue_id}.mp4`)
        await writeFile(outputPath, bytes)
        return pathToFileURL(outputPath).toString()
      }

      const statusPayload = (await retrieveResponse.json().catch(() => null)) as
        | { status?: string; error?: { message?: string } }
        | null

      if (statusPayload?.status === 'failed' || statusPayload?.status === 'error') {
        throw new Error(statusPayload.error?.message ?? 'Video generation failed.')
      }
    }

    throw new Error('Video generation is still processing. Try again in a moment.')
  }
}
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
