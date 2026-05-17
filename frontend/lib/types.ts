export type ModelId =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001'

export interface ModelInfo {
  id: ModelId
  name: string
  inputPricePer1M: number   // USD
  outputPricePer1M: number  // USD
  description: string
}

export const MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4',
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    description: 'Most capable model',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4',
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    description: 'Balanced performance & speed',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    inputPricePer1M: 0.8,
    outputPricePer1M: 4,
    description: 'Fastest & most affordable',
  },
]

export interface Attachment {
  id: string
  name: string
  type: string        // MIME type
  size: number
  data: string        // base64
  preview?: string    // base64 image preview
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
