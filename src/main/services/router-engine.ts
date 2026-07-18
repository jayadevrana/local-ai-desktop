import type {
  ChatThread,
  ComplexityLevel,
  IntentLane,
  LocalAiModel,
  ModelRegistrySnapshot,
  ModelTag,
  ModelType,
  ModerationDecision,
  PreferenceMode,
  RequestUrgency,
  RoutingClassification,
  RoutingDecision,
  RoutingPreferences,
  TaskType
} from '@shared/types'

const complexityWeight: Record<ComplexityLevel, number> = {
  trivial: 1,
  low: 2,
  medium: 3,
  high: 4,
  expert: 5
}

const detectTaskType = (prompt: string): TaskType => {
  const lower = prompt.toLowerCase()
  if (/(debug|bug|stack trace|error|traceback|fix)/.test(lower)) return 'debugging'
  if (/(code|typescript|python|rust|react|electron|refactor|function|class|api)/.test(lower)) return 'coding'
  if (/(summari[sz]e|tl;dr|condense)/.test(lower)) return 'summarization'
  if (/(brainstorm|idea|concept|angles|names)/.test(lower)) return 'brainstorming'
  if (/(research|compare|sources|evaluate)/.test(lower)) return 'research'
  if (/(roleplay|dialogue|character|fiction|story|scene|horror|villain)/.test(lower)) return 'roleplay'
  if (/(translate|translation|rewrite in)/.test(lower)) return 'translation'
  if (/(analyze|analysis|why|root cause)/.test(lower)) return 'analysis'
  if (/(plan|roadmap|architecture|spec|design)/.test(lower)) return 'planning'
  if (/(write|tone|copy|essay|blog|post|email|poem)/.test(lower)) return 'writing'
  return 'general'
}

const detectUrgency = (prompt: string): RequestUrgency => {
  const lower = prompt.toLowerCase()
  if (/(quick|brief|fast|short|just give me|in one line)/.test(lower)) return 'quick'
  if (/(deep|thorough|detailed|comprehensive|step by step|exhaustive)/.test(lower)) return 'thorough'
  return 'balanced'
}

const estimateComplexity = (prompt: string, taskType: TaskType): ComplexityLevel => {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length
  const lines = prompt.split('\n').length
  const signals =
    Number(words > 60) +
    Number(words > 180) +
    Number(lines > 8) +
    Number(/```|stack trace|architecture|multi-step|compare|tradeoffs/.test(prompt.toLowerCase())) +
    Number(['coding', 'debugging', 'analysis', 'planning', 'research'].includes(taskType))

  if (signals <= 1) return 'trivial'
  if (signals === 2) return 'low'
  if (signals === 3) return 'medium'
  if (signals === 4) return 'high'
  return 'expert'
}

const estimateCreativity = (prompt: string, taskType: TaskType): number => {
  const lower = prompt.toLowerCase()
  let score = 0
  if (['roleplay', 'writing', 'brainstorming'].includes(taskType)) score += 35
  if (/(creative|original|fiction|raw|gritty|dark|uncensored|unfiltered|edgy|satire)/.test(lower)) score += 35
  if (/(tone|voice|dialogue|poem|style|scene)/.test(lower)) score += 15
  return Math.min(score, 100)
}

const estimatePrecision = (taskType: TaskType, prompt: string): number => {
  let score = 20
  if (['coding', 'debugging', 'analysis', 'planning', 'translation'].includes(taskType)) score += 35
  if (/(exact|strict|accurate|correct|json|schema|step by step)/.test(prompt.toLowerCase())) score += 25
  return Math.min(score, 100)
}

const estimateSensitivity = (prompt: string): number => {
  const lower = prompt.toLowerCase()
  if (/(child sexual|minor sexual|bomb|bioweapon|terror|murder someone|kill someone)/.test(lower)) return 100
  if (/(self harm|suicide|fraud|exploit|malware|weapon)/.test(lower)) return 70
  return 10
}

const detectFreedomIntent = (prompt: string): number => {
  const lower = prompt.toLowerCase()
  let score = 0
  if (/(uncensored|unfiltered|no filter|be direct|raw|gritty|taboo|nsfw|edgy|dark fiction)/.test(lower)) score += 50
  if (/(tone fidelity|preserve tone|don't sanitize|realistic dialogue|villain dialogue)/.test(lower)) score += 30
  return Math.min(score, 100)
}

const wantsImage = (prompt: string) => /^\/image\b/i.test(prompt)
const wantsVideo = (prompt: string) => /^\/video\b/i.test(prompt)

const stripSlashMode = (prompt: string): string =>
  prompt.replace(/^\/(image|video)\b\s*/i, '').trim()

export const getPromptMode = (prompt: string): ModelType => {
  if (wantsImage(prompt)) return 'image'
  if (wantsVideo(prompt)) return 'video'
  return 'text'
}

const detectIntentLane = (
  prompt: string,
  mode: ModelType,
  taskType: TaskType,
  freedomScore: number
): IntentLane => {
  if (mode === 'image') return 'image'
  if (mode === 'video') return 'video'
  if (freedomScore >= 45) return 'uncensored'
  if (taskType === 'coding' || taskType === 'debugging' || taskType === 'planning') return 'build'
  if (taskType === 'research' || taskType === 'analysis' || taskType === 'summarization') return 'research'
  if (taskType === 'writing' || taskType === 'roleplay' || taskType === 'brainstorming') return 'write'
  if (taskType === 'translation') return 'learn'
  return 'learn'
}

export const getCleanPrompt = (prompt: string): string => stripSlashMode(prompt)

const summarizeRouting = (classification: RoutingClassification, modelName: string): string => {
  if (classification.allowLessRestrictive) {
    return `Benign high-expression request routed to ${modelName} for stronger tone fidelity.`
  }
  if (classification.taskType === 'coding' || classification.taskType === 'debugging') {
    return `Code-focused request routed to ${modelName} for stronger reasoning and implementation accuracy.`
  }
  if (classification.complexity === 'expert' || classification.complexity === 'high') {
    return `High-complexity request routed to ${modelName} for deeper reasoning.`
  }
  if (classification.urgency === 'quick') {
    return `Short-latency request routed to ${modelName} for faster answers.`
  }
  return `Balanced request routed to ${modelName} for quality and responsiveness.`
}

const modelMatchesMode = (model: LocalAiModel, mode: ModelType) => model.type === mode

const hasTag = (model: LocalAiModel, tag: ModelTag) => model.tags.includes(tag)

const scoreModel = (
  model: LocalAiModel,
  classification: RoutingClassification,
  preferences: RoutingPreferences,
  defaults: ModelRegistrySnapshot['defaults'],
  mode: ModelType,
  lane: IntentLane
): number => {
  if (!modelMatchesMode(model, mode)) return -1000

  let score = 0
  const preferenceMode = preferences.defaultMode

  if (preferenceMode === 'speed') {
    score += model.speedClass === 'fast' ? 24 : model.speedClass === 'balanced' ? 12 : 0
  }
  if (preferenceMode === 'quality') {
    score += model.reasoningClass === 'strong' ? 26 : model.reasoningClass === 'balanced' ? 14 : 0
  }
  if (preferenceMode === 'cost') {
    score += model.pricing.input !== null && model.pricing.input < 1 ? 20 : 5
  }
  if (preferenceMode === 'creativity') {
    score += model.creativityClass === 'expressive' ? 24 : 8
  }
  if (preferenceMode === 'safety') {
    score += model.safetyClass === 'safety-hardened' ? 22 : 4
  }

  if (classification.taskType === 'coding' || classification.taskType === 'debugging') {
    score += hasTag(model, 'coding') ? 28 : 0
  }
  if (lane === 'build') {
    score += hasTag(model, 'coding') ? 18 : 0
  }
  if (lane === 'write') {
    score += hasTag(model, 'creative') ? 16 : 0
  }
  if (lane === 'research' || lane === 'learn') {
    score += model.capabilities.supportsWebSearch ? 14 : 0
    score += hasTag(model, 'reasoning') ? 12 : 0
  }
  if (classification.complexity === 'high' || classification.complexity === 'expert') {
    score += hasTag(model, 'reasoning') ? 24 : 0
  }
  if (classification.creativityScore >= 55) {
    score += hasTag(model, 'creative') ? 18 : 0
  }
  if (classification.allowLessRestrictive) {
    score += hasTag(model, 'less_restrictive') ? 36 : -8
  } else if (preferences.neverAutoRouteToLessRestrictive) {
    score += hasTag(model, 'less_restrictive') ? -50 : 5
  }

  if (classification.sensitivityScore >= 70) {
    score += model.safetyClass === 'safety-hardened' ? 32 : -18
  }

  if (classification.requiredContextTokens > 100_000) {
    score += (model.availableContextTokens ?? 0) > 120_000 ? 18 : -16
  }

  if (classification.urgency === 'quick') {
    score += model.speedClass === 'fast' ? 18 : -6
  }

  if (defaults.defaultCode && model.id === defaults.defaultCode && classification.taskType === 'coding') score += 20
  if (defaults.defaultReasoning && model.id === defaults.defaultReasoning && classification.complexity !== 'trivial') score += 20
  if (defaults.mostIntelligent && model.id === defaults.mostIntelligent && complexityWeight[classification.complexity] >= 4) score += 18
  if (defaults.mostExpressive && model.id === defaults.mostExpressive && classification.allowLessRestrictive) score += 24

  if (model.routingPreference.mode === 'boost') score += 18
  if (model.routingPreference.mode === 'avoid') score -= 25
  if (model.favorited) score += 8
  if (model.pinned) score += 6

  return score
}

export const evaluateModeration = (prompt: string): ModerationDecision => {
  const lower = prompt.toLowerCase()
  if (/(child sexual|minor sexual|hire a killer|build a bomb|make anthrax|commit terrorism)/.test(lower)) {
    return 'block'
  }
  if (/(weapon|fraud|malware|exploit)/.test(lower)) {
    return 'soft-limit'
  }
  return 'allow'
}

export const buildRoutingDecision = (params: {
  prompt: string
  mode: ModelType
  registry: ModelRegistrySnapshot
  preferences: RoutingPreferences
  requestId: string
  laneHint?: IntentLane | null
  manualModelId?: string | null
  thread?: ChatThread | null
}): RoutingDecision => {
  const prompt = getCleanPrompt(params.prompt)
  const taskType = detectTaskType(prompt)
  const complexity = estimateComplexity(prompt, taskType)
  const urgency = detectUrgency(prompt)
  const sensitivityScore = estimateSensitivity(prompt)
  const creativityScore = estimateCreativity(prompt, taskType)
  const precisionScore = estimatePrecision(taskType, prompt)
  const freedomScore = detectFreedomIntent(prompt)
  const requiredContextTokens = Math.max(prompt.length * 2, params.thread?.messages.length ? 16000 : 4000)

  const allowLessRestrictive =
    params.preferences.enableLessRestrictiveRouting &&
    !params.preferences.neverAutoRouteToLessRestrictive &&
    sensitivityScore < 70 &&
    (freedomScore >= 40 ||
      (params.preferences.creativeFreedomMode === 'high' && creativityScore >= 40) ||
      (params.preferences.preferToneFidelityOverSanitization && creativityScore >= 55))

  const classification: RoutingClassification = {
    taskType,
    complexity,
    urgency,
    requiredContextTokens,
    sensitivityScore,
    creativityScore,
    precisionScore,
    freedomScore,
    allowLessRestrictive
  }
  const selectedLane = params.laneHint ?? detectIntentLane(prompt, params.mode, taskType, freedomScore)

  const models = params.registry.models.filter((model) => modelMatchesMode(model, params.mode))
  const selectedModel =
    params.manualModelId && models.find((model) => model.id === params.manualModelId)
      ? models.find((model) => model.id === params.manualModelId)!
      : [...models]
          .map((model) => ({
            model,
            score: scoreModel(
              model,
              classification,
              params.preferences,
              params.registry.defaults,
              params.mode,
              selectedLane
            )
          }))
          .sort((left, right) => right.score - left.score)[0]?.model

  if (!selectedModel) {
    throw new Error(`No ${params.mode} model is available for routing.`)
  }

  const fallbackModelIds = [...models]
    .filter((model) => model.id !== selectedModel.id)
    .map((model) => ({
      id: model.id,
      score: scoreModel(
        model,
        classification,
        params.preferences,
        params.registry.defaults,
        params.mode,
        selectedLane
      )
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry) => entry.id)

  const reasons = [
    `Capability lane: ${selectedLane}`,
    `Classified as ${complexity}-complexity ${taskType} task`,
    urgency === 'quick'
      ? 'Prioritizing low-latency response'
      : urgency === 'thorough'
        ? 'Prioritizing depth and completeness'
        : 'Balancing quality and responsiveness',
    requiredContextTokens > 100_000 ? 'Using extended context candidate set' : 'Standard context sizing',
    allowLessRestrictive
      ? 'High expressive freedom requested for benign intent'
      : 'Balanced policy mode retained',
    `Selected ${selectedModel.name}`
  ]

  return {
    requestId: params.requestId,
    provider: 'local-ai',
    selectedModelId: selectedModel.id,
    fallbackModelIds,
    selectedMode: params.mode,
    selectedLane,
    preferenceMode: params.preferences.defaultMode,
    classification,
    reasoningSummary: summarizeRouting(classification, selectedModel.name),
    reasons,
    usedManualOverride: Boolean(params.manualModelId)
  }
}
