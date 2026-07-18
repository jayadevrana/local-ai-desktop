export type AppView = 'chat' | 'models' | 'settings' | 'diagnostics'
export type ProviderId = 'local-ai'
export type ModelType = 'text' | 'image' | 'video'
export type TaskType =
  | 'coding'
  | 'debugging'
  | 'writing'
  | 'summarization'
  | 'brainstorming'
  | 'research'
  | 'roleplay'
  | 'translation'
  | 'analysis'
  | 'planning'
  | 'general'

export type IntentLane =
  | 'uncensored'
  | 'write'
  | 'research'
  | 'learn'
  | 'build'
  | 'image'
  | 'video'

export type ComplexityLevel = 'trivial' | 'low' | 'medium' | 'high' | 'expert'
export type PreferenceMode = 'speed' | 'quality' | 'cost' | 'creativity' | 'safety'
export type CreativeFreedomMode = 'off' | 'balanced' | 'high'
export type ToneProtection = 'conservative' | 'neutral' | 'unfiltered'
export type RequestUrgency = 'quick' | 'balanced' | 'thorough'
export type ModerationDecision = 'allow' | 'soft-limit' | 'block'
export type StreamPhase =
  | 'idle'
  | 'analyzing-request'
  | 'estimating-complexity'
  | 'selecting-model'
  | 'generating-answer'
  | 'refining-output'
  | 'completed'
  | 'error'
  | 'cancelled'

export type ModelTag =
  | 'general'
  | 'coding'
  | 'reasoning'
  | 'creative'
  | 'less_restrictive'
  | 'safety_hardened'

export interface AppSettings {
  provider: {
    label: string
    apiBaseUrl: string
    apiKeyPresent: boolean
    useEmbeddedKey: boolean
  }
  routing: RoutingPreferences
  features: {
    automaticRouting: boolean
    streaming: boolean
    animations: boolean
    compactMode: boolean
    showInspector: boolean
    verboseDiagnostics: boolean
  }
  defaults: {
    preferredModelId: string | null
    defaultMode: PreferenceMode
  }
  storage: {
    dataPath: string
  }
}

export interface RoutingPreferences {
  defaultMode: PreferenceMode
  enableLessRestrictiveRouting: boolean
  neverAutoRouteToLessRestrictive: boolean
  askBeforeModelClassSwitch: boolean
  preferToneFidelityOverSanitization: boolean
  creativeFreedomMode: CreativeFreedomMode
  toneProtection: ToneProtection
}

export interface LocalAiCapabilities {
  optimizedForCode: boolean
  supportsFunctionCalling: boolean
  supportsReasoning: boolean
  supportsReasoningEffort: boolean
  supportsVision: boolean
  supportsAudioInput: boolean
  supportsVideoInput: boolean
  supportsWebSearch: boolean
  supportsResponseSchema: boolean
}

export interface ModelPricing {
  input: number | null
  output: number | null
  cacheInput: number | null
}

export interface ModelRoutingPreference {
  mode: 'neutral' | 'boost' | 'avoid'
}

export interface LocalAiModel {
  id: string
  provider: ProviderId
  name: string
  type: ModelType
  description: string
  created: number | null
  availableContextTokens: number | null
  maxCompletionTokens: number | null
  capabilities: LocalAiCapabilities
  pricing: ModelPricing
  privacy: string | null
  traits: string[]
  tags: ModelTag[]
  speedClass: 'fast' | 'balanced' | 'slow'
  reasoningClass: 'light' | 'balanced' | 'strong'
  creativityClass: 'guarded' | 'balanced' | 'expressive'
  safetyClass: 'balanced' | 'less-restrictive' | 'safety-hardened'
  favorited: boolean
  pinned: boolean
  routingPreference: ModelRoutingPreference
}

export interface ModelRegistrySnapshot {
  models: LocalAiModel[]
  defaults: {
    default: string | null
    mostIntelligent: string | null
    defaultCode: string | null
    defaultReasoning: string | null
    mostExpressive: string | null
  }
  lastUpdatedAt: number | null
  stale: boolean
}

export interface RoutingClassification {
  taskType: TaskType
  complexity: ComplexityLevel
  urgency: RequestUrgency
  requiredContextTokens: number
  sensitivityScore: number
  creativityScore: number
  precisionScore: number
  freedomScore: number
  allowLessRestrictive: boolean
}

export interface RoutingDecision {
  requestId: string
  provider: ProviderId
  selectedModelId: string
  fallbackModelIds: string[]
  selectedMode: ModelType
  selectedLane: IntentLane
  preferenceMode: PreferenceMode
  classification: RoutingClassification
  reasoningSummary: string
  reasons: string[]
  usedManualOverride: boolean
}

export interface ThinkingState {
  phase: StreamPhase
  phaseLabel: string
  reasoningSummary: string
  selectedModelId: string | null
  fallbackModelId: string | null
  elapsedMs: number
  statusLine: string
  networkStatus: 'idle' | 'streaming' | 'success' | 'error' | 'offline'
}

export interface AttachmentPlaceholder {
  id: string
  name: string
  size: number
  mimeType: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  mode: ModelType
  text: string
  createdAt: number
  modelId?: string
  routingDecision?: RoutingDecision
  reasoningSummary?: string
  assetUrl?: string
  attachments?: AttachmentPlaceholder[]
  error?: string
}

export interface ChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pinned: boolean
  favorite: boolean
  projectScope: string | null
  messages: ChatMessage[]
}

export interface DiagnosticLogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'provider' | 'router' | 'chat' | 'models' | 'settings' | 'system'
  message: string
  details?: Record<string, unknown>
}

export interface StartChatRequest {
  threadId: string
  requestId: string
  prompt: string
  mode: ModelType
  laneHint?: IntentLane | null
  manualModelId?: string | null
  manualRoutingOverride: boolean
  attachments?: AttachmentPlaceholder[]
}

export interface StreamEventEnvelope {
  requestId: string
  threadId: string
  type:
    | 'thinking'
    | 'routing'
    | 'message-start'
    | 'message-chunk'
    | 'message-complete'
    | 'asset-complete'
    | 'message-error'
    | 'stopped'
  payload: Record<string, unknown>
}

export interface AppBootstrap {
  settings: AppSettings
  threads: ChatThread[]
  registry: ModelRegistrySnapshot
  diagnostics: DiagnosticLogEntry[]
}

export interface ExportChatRequest {
  threadId: string
  format: 'markdown' | 'json'
}
