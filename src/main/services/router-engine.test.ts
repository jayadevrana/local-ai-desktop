import { describe, expect, it } from 'vitest'

import type { ModelRegistrySnapshot } from '@shared/types'

import { buildRoutingDecision } from './router-engine'

const registry: ModelRegistrySnapshot = {
  models: [
    {
      id: 'venice-uncensored',
      provider: 'local-ai',
      name: 'Uncensored',
      type: 'text',
      description: 'Expressive text model',
      created: null,
      availableContextTokens: 64000,
      maxCompletionTokens: 8000,
      capabilities: {
        optimizedForCode: false,
        supportsFunctionCalling: false,
        supportsReasoning: true,
        supportsReasoningEffort: false,
        supportsVision: false,
        supportsAudioInput: false,
        supportsVideoInput: false,
        supportsWebSearch: false,
        supportsResponseSchema: false
      },
      pricing: { input: 0.8, output: 1.2, cacheInput: 0.2 },
      privacy: null,
      traits: [],
      tags: ['general', 'creative', 'less_restrictive'],
      speedClass: 'balanced',
      reasoningClass: 'balanced',
      creativityClass: 'expressive',
      safetyClass: 'less-restrictive',
      favorited: false,
      pinned: false,
      routingPreference: { mode: 'neutral' }
    },
    {
      id: 'coder-max',
      provider: 'local-ai',
      name: 'Coder Max',
      type: 'text',
      description: 'Code model',
      created: null,
      availableContextTokens: 200000,
      maxCompletionTokens: 16000,
      capabilities: {
        optimizedForCode: true,
        supportsFunctionCalling: true,
        supportsReasoning: true,
        supportsReasoningEffort: true,
        supportsVision: false,
        supportsAudioInput: false,
        supportsVideoInput: false,
        supportsWebSearch: true,
        supportsResponseSchema: true
      },
      pricing: { input: 1.2, output: 4.1, cacheInput: 0.24 },
      privacy: null,
      traits: [],
      tags: ['general', 'coding', 'reasoning', 'safety_hardened'],
      speedClass: 'balanced',
      reasoningClass: 'strong',
      creativityClass: 'guarded',
      safetyClass: 'safety-hardened',
      favorited: false,
      pinned: false,
      routingPreference: { mode: 'neutral' }
    },
    {
      id: 'fast-general',
      provider: 'local-ai',
      name: 'Fast General',
      type: 'text',
      description: 'Quick answers',
      created: null,
      availableContextTokens: 64000,
      maxCompletionTokens: 8000,
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
      pricing: { input: 0.2, output: 0.4, cacheInput: 0.1 },
      privacy: null,
      traits: [],
      tags: ['general', 'safety_hardened'],
      speedClass: 'fast',
      reasoningClass: 'light',
      creativityClass: 'balanced',
      safetyClass: 'safety-hardened',
      favorited: false,
      pinned: false,
      routingPreference: { mode: 'neutral' }
    }
  ],
  defaults: {
    default: 'fast-general',
    mostIntelligent: 'coder-max',
    defaultCode: 'coder-max',
    defaultReasoning: 'coder-max',
    mostExpressive: 'venice-uncensored'
  },
  lastUpdatedAt: Date.now(),
  stale: false
}

describe('buildRoutingDecision', () => {
  it('routes build prompts to the strongest code path', () => {
    const decision = buildRoutingDecision({
      prompt: 'Debug this TypeScript auth race condition and propose a robust refactor.',
      mode: 'text',
      registry,
      preferences: {
        defaultMode: 'quality',
        enableLessRestrictiveRouting: true,
        neverAutoRouteToLessRestrictive: false,
        askBeforeModelClassSwitch: false,
        preferToneFidelityOverSanitization: true,
        creativeFreedomMode: 'balanced',
        toneProtection: 'neutral'
      },
      requestId: 'req-build'
    })

    expect(decision.selectedLane).toBe('build')
    expect(decision.selectedModelId).toBe('coder-max')
  })

  it('routes benign uncensored creative prompts to the expressive lane', () => {
    const decision = buildRoutingDecision({
      prompt: 'Write a raw, gritty villain monologue with unfiltered dialogue and dark fiction energy.',
      mode: 'text',
      registry,
      preferences: {
        defaultMode: 'creativity',
        enableLessRestrictiveRouting: true,
        neverAutoRouteToLessRestrictive: false,
        askBeforeModelClassSwitch: false,
        preferToneFidelityOverSanitization: true,
        creativeFreedomMode: 'high',
        toneProtection: 'unfiltered'
      },
      requestId: 'req-uncensored'
    })

    expect(decision.selectedLane).toBe('uncensored')
    expect(decision.selectedModelId).toBe('venice-uncensored')
  })
})
