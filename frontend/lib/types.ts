// ModelId is now a plain string so new providers can be added freely
export type ModelId = string

export type Provider = 'anthropic' | 'google' | 'groq'

export interface ModelInfo {
  id: ModelId
  name: string
  provider: Provider
  providerLabel: string
  providerColor: string       // for badges
  inputPricePer1M: number     // USD -- 0 for free models
  outputPricePer1M: number    // USD -- 0 for free models
  description: string
  contextWindow: string       // e.g. "200K", "1M"
  isFree: boolean
  supportsVision: boolean
  isDefault?: boolean         // the app's default selection
  badge?: string              // e.g. "Recommended", "Fastest", "New"
}

// --- MODEL REGISTRY ---

export const MODELS: ModelInfo[] = [

  // Google Gemini (free via Google AI Studio)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    providerLabel: 'Google',
    providerColor: '#4285f4',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Best free model - 1M context - thinking mode',
    contextWindow: '1M',
    isFree: true,
    supportsVision: true,
    isDefault: true,
    badge: 'Recommended',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    providerLabel: 'Google',
    providerColor: '#4285f4',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Fastest and most budget-friendly - 1M context',
    contextWindow: '1M',
    isFree: true,
    supportsVision: true,
    badge: 'Fastest',
  },

  // Groq -- Compound (agentic, built-in web search)
  {
    id: 'groq/compound-beta',
    name: 'Compound Beta',
    provider: 'groq',
    providerLabel: 'Groq',
    providerColor: '#f55036',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Agentic - built-in web search - auto tool use',
    contextWindow: '128K',
    isFree: true,
    supportsVision: false,
    badge: 'New',
  },

  // Groq -- Llama (free tier, ultra-fast)
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout',
    provider: 'groq',
    providerLabel: 'Groq',
    providerColor: '#f55036',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Llama 4 - MoE architecture - vision - 128K',
    contextWindow: '128K',
    isFree: true,
    supportsVision: true,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    providerLabel: 'Groq',
    providerColor: '#f55036',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Best Llama 3 - ultra-fast inference - 128K',
    contextWindow: '128K',
    isFree: true,
    supportsVision: false,
    badge: 'Fast',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    providerLabel: 'Groq',
    providerColor: '#f55036',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Lightning-fast - great for simple tasks - 128K',
    contextWindow: '128K',
    isFree: true,
    supportsVision: false,
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'groq',
    providerLabel: 'Groq',
    providerColor: '#f55036',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: "Google's compact open model - 8K",
    contextWindow: '8K',
    isFree: true,
    supportsVision: false,
  },

  // Anthropic Claude (paid)
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    providerColor: '#c85a3a',
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    description: 'Balanced performance - 200K',
    contextWindow: '200K',
    isFree: false,
    supportsVision: true,
    badge: 'Balanced',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    providerColor: '#c85a3a',
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    description: 'Most capable - 200K',
    contextWindow: '200K',
    isFree: false,
    supportsVision: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    providerColor: '#c85a3a',
    inputPricePer1M: 0.8,
    outputPricePer1M: 4,
    description: 'Fastest Anthropic model - 200K',
    contextWindow: '200K',
    isFree: false,
    supportsVision: true,
  },
]

export const DEFAULT_MODEL_ID: ModelId =
  MODELS.find(m => m.isDefault)?.id ?? 'gemini-2.5-flash'

// --- OTHER TYPES ---

export interface Attachment {
  id: string
  name: string
  type: string        // MIME type
  size: number
  data: string        // base64
  preview?: string    // base64 image preview (data URL)
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  timestamp: number
  usage?: TokenUsage
  model?: ModelId
}

export interface Conversation {
  id: string
  title: string
  model: ModelId
  messages: Message[]
  createdAt: number
  updatedAt: number
  totalUsage: TokenUsage
}
