import { REGISTRY_CACHE_FILE, REGISTRY_CACHE_TTL_MS } from '@shared/defaults'
import type { LocalAiModel, ModelRegistrySnapshot } from '@shared/types'

import { JsonStore } from '../lib/json-store'
import { LocalAiProvider } from './local-ai-provider'

export class ModelRegistryService {
  private readonly store: JsonStore<ModelRegistrySnapshot>

  constructor(
    dataDir: string,
    private readonly provider: LocalAiProvider
  ) {
    this.store = new JsonStore<ModelRegistrySnapshot>(dataDir, REGISTRY_CACHE_FILE, () => ({
      models: [],
      defaults: {
        default: null,
        mostIntelligent: null,
        defaultCode: null,
        defaultReasoning: null,
        mostExpressive: null
      },
      lastUpdatedAt: null,
      stale: true
    }))
  }

  async getSnapshot(forceRefresh = false): Promise<ModelRegistrySnapshot> {
    const current = await this.store.read()
    const isFresh =
      current.lastUpdatedAt !== null && Date.now() - current.lastUpdatedAt < REGISTRY_CACHE_TTL_MS
    const hasImageModels = current.models.some((model) => model.type === 'image')
    const hasVideoModels = current.models.some((model) => model.type === 'video')
    const isComplete = hasImageModels && hasVideoModels

    if (!forceRefresh && current.models.length > 0 && isFresh && isComplete) {
      return { ...current, stale: false }
    }

    try {
      const next = await this.provider.fetchRegistry(current.models)
      await this.store.write(next)
      return next
    } catch {
      return {
        ...current,
        stale: true
      }
    }
  }

  async updateModelPreference(
    modelId: string,
    patch: Partial<Pick<LocalAiModel, 'favorited' | 'pinned' | 'routingPreference'>>
  ): Promise<ModelRegistrySnapshot> {
    const snapshot = await this.store.read()
    const models = snapshot.models.map((model) =>
      model.id === modelId
        ? {
            ...model,
            ...patch,
            routingPreference: {
              ...model.routingPreference,
              ...(patch.routingPreference ?? {})
            }
          }
        : model
    )
    const next = {
      ...snapshot,
      models
    }
    await this.store.write(next)
    return next
  }
}
