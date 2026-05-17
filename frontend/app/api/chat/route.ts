import Anthropic from '@anthropic-ai/sdk'
type MessageParam = Anthropic.MessageParam
import { NextRequest } from 'next/server'

export const runtime: 'nodejs' = 'nodejs'
export const maxDuration = 120
export const dynamic: 'force-dynamic' = 'force-dynamic'

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(modelId: string): 'anthropic' | 'google' | 'groq' {
  if (modelId.startsWith('gemini')) return 'google'
  if (
    modelId.startsWith('llama') ||
    modelId.startsWith('meta-llama/') ||
    modelId.startsWith('mixtral') ||
    modelId.startsWith('gemma') ||
    modelId.startsWith('qwen') ||
    modelId.startsWith('deepseek')
  ) return 'groq'
  return 'anthropic'
}

// ─── Message builders ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAnthropicMessages(messages: any[]): MessageParam[] {
  return messages.map((msg: any): MessageParam => {
    if (msg.role === 'user') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = []
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.type.startsWith('image/')) {
            content.push({ type: 'image', source: { type: 'base64', media_type: att.type, data: att.data } })
          } else {
            content.push({ type: 'text', text: `[File: ${att.name}]\n${Buffer.from(att.data, 'base64').toString('utf-8')}` })
          }
        }
      }
      content.push({ type: 'text', text: msg.content })
      return { role: 'user', content }
    }
    return { role: 'assistant', content: msg.content as string }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOpenAIMessages(systemPrompt: string, messages: any[], supportsVision: boolean) {
  const result: any[] = [{ role: 'system', content: systemPrompt }]
  for (const msg of messages) {
    if (msg.role === 'user') {
      const hasImages = supportsVision && msg.attachments?.some((a: any) => a.type.startsWith('image/'))
      if (hasImages || msg.attachments?.some((a: any) => !a.type.startsWith('image/'))) {
        const parts: any[] = []
        if (msg.content) parts.push({ type: 'text', text: msg.content })
        for (const att of (msg.attachments ?? [])) {
          if (att.type.startsWith('image/') && supportsVision) {
            parts.push({ type: 'image_url', image_url: { url: `data:${att.type};base64,${att.data}` } })
          } else if (!att.type.startsWith('image/')) {
            parts.push({ type: 'text', text: `[File: ${att.name}]\n${Buffer.from(att.data, 'base64').toString('utf-8')}` })
          }
        }
        result.push({ role: 'user', content: parts })
      } else {
        result.push({ role: 'user', content: msg.content || '' })
      }
    } else {
      result.push({ role: 'assistant', content: msg.content || '' })
    }
  }
  return result
}

// ─── Streaming helpers ────────