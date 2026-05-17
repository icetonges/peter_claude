import { Conversation, ModelId, Message, TokenUsage, DEFAULT_MODEL_ID } from './types'

const STORAGE_KEY = 'peterclaude_conversations'

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Conversation[]
  } catch {
    return []
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // Storage full or unavailable
  }
}

export function createConversation(model: ModelId = DEFAULT_MODEL_ID): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    model,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalUsage: { inputTokens: 0, outputTokens: 0 },
  }
}

export function generateTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.replace(/\s+/g, ' ').trim()
  return clean.length > 60 ? clean.slice(0, 57) + '…' : clean
}

export function addMessageToConversation(
  conv: Conversation,
  message: Message
): Conversation {
  const updatedUsage: TokenUsage = {
    inputTokens: conv.totalUsage.inputTokens + (message.usage?.inputTokens ?? 0),
    outputTokens: conv.totalUsage.outputTokens + (message.usage?.outputTokens ?? 0),
  }
  return {
    ...conv,
    messages: [...conv.messages, message],
    updatedAt: Date.now(),
    totalUsage: updatedUsage,
    title:
      conv.messages.length === 0 && message.role === 'user'
        ? generateTitle(message.content)
        : conv.title,
  }
}

export function calcCost(
  usage: TokenUsage,
  inputPricePer1M: number,
  outputPricePer1M: number
): number {
  return (
    (usage.inputTokens / 1_000_000) * inputPricePer1M +
    (usage.outputTokens / 1_000_000) * outputPricePer1M
  )
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '<$0.0001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}
