import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocalAiProvider } from './local-ai-provider'

describe('LocalAiProvider.fetchRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes remote models and defaults into the local registry snapshot', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'nano-banana-pro',
                type: 'image',
                created: 1775000000,
                model_spec: {
                  name: 'Nano Banana Pro',
                  description: 'Fast image generation',
                  availableContextTokens: 0,
                  maxCompletionTokens: 0,
                  capabilities: {
                    optimizedForCode: false,
                    supportsFunctionCalling: false,
                    supportsReasoning: false,
                    supportsReasoningEffort: false,
                    supportsVision: false,
                    supportsAudioInput: false,
                    supportsVideoInput: false,
                    supportsWebSearch: false,
                    supportsResponseSchema: false
                  },
                  pricing: {
                    input: { usd: 0.3 },
                    output: { usd: 0.6 },
                    cache_input: { usd: 0.1 }
                  },
                  privacy: 'private',
                  traits: []
                }
              }
            ]
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              default: 'fast-general',
              most_intelligent: 'coder-max',
              default_code: 'coder-max',
              default_reasoning: 'coder-max',
              most_uncensored: 'venice-uncensored'
            }
          })
        )
      )

    const provider = new LocalAiProvider(async () => 'test-key')
    const snapshot = await provider.fetchRegistry()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(snapshot.models[0].id).toBe('nano-banana-pro')
    expect(snapshot.models[0].name).toBe('Nano Banana Pro')
    expect(snapshot.defaults.mostExpressive).toBe('venice-uncensored')
  })
})
