import type { AppSettings, PreferenceMode, RoutingPreferences } from './types'

export const APP_NAME = 'Local AI'
export const PROVIDER_LABEL = 'Local AI'
export const LOCAL_AI_BASE_URL = 'https://api.venice.ai/api/v1'

// Provide the API key via the LOCAL_AI_API_KEY / VENICE_API_KEY environment
// variable or the in-app Settings UI. Do not commit a real key here.
export const EMBEDDED_LOCAL_AI_KEY =
  process.env.LOCAL_AI_API_KEY ?? process.env.VENICE_API_KEY ?? ''

export const DEFAULT_ROUTING_PREFERENCES: RoutingPreferences = {
  defaultMode: 'quality',
  enableLessRestrictiveRouting: true,
  neverAutoRouteToLessRestrictive: false,
  askBeforeModelClassSwitch: false,
  preferToneFidelityOverSanitization: true,
  creativeFreedomMode: 'balanced',
  toneProtection: 'neutral'
}

export const DEFAULT_PREFERENCE_MODES: PreferenceMode[] = [
  'speed',
  'quality',
  'cost',
  'creativity',
  'safety'
]

export const DEFAULT_SETTINGS = (dataPath: string): AppSettings => ({
  provider: {
    label: PROVIDER_LABEL,
    apiBaseUrl: LOCAL_AI_BASE_URL,
    apiKeyPresent: true,
    useEmbeddedKey: true
  },
  routing: DEFAULT_ROUTING_PREFERENCES,
  features: {
    automaticRouting: true,
    streaming: true,
    animations: true,
    compactMode: false,
    showInspector: true,
    verboseDiagnostics: false
  },
  defaults: {
    preferredModelId: null,
    defaultMode: 'quality'
  },
  storage: {
    dataPath
  }
})

export const ROUTING_CONFIG_FILE = 'routing-preferences.json'
export const SETTINGS_FILE = 'settings.json'
export const THREADS_FILE = 'threads.json'
export const DIAGNOSTICS_FILE = 'diagnostics.json'
export const REGISTRY_CACHE_FILE = 'registry-cache.json'
export const REGISTRY_CACHE_TTL_MS = 1000 * 60 * 60 * 4
