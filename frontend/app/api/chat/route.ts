import Anthropic from '@anthropic-ai/sdk'
type MessageParam = Anthropic.MessageParam
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// --- Provider detection ---

function detectProvider(modelId: string): 'anthropic' | 'google' | 'groq' {
  if (modelId.startsWith('gemini')) return 'google'
  if (
    modelId.startsWith('llama') ||
    modelId.startsWith('meta-llama/') ||
    modelId.startsWith('mixtral') ||
    modelId.startsWith('gemma') ||
    modelId.startsWith('qwen') ||
    modelId.startsWith('deepseek') ||
    modelId.startsWith('groq/')
  ) return 'groq'
  return 'anthropic'
}

// --- Build default system prompt with current date ---

function buildSystemPrompt(custom?: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  if (custom) return custom
  return `You are a helpful, knowledgeable AI assistant. Today is ${dateStr} (${timeStr}). You can answer questions about current events up to your knowledge cutoff, and you always let users know when information may be outdated.`
}

// --- Message builders ---

function buildAnthropicMessages(messages: any[]): MessageParam[] {
  return messages.map((msg: any): MessageParam => {
    if (msg.role === 'user') {
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

// --- Streaming helpers ---

const encoder = new TextEncoder()

function makeStream(fn: (controller: ReadableStreamDefaultController) => Promise<void>) {
  return new ReadableStream({ start: fn })
}

function enqueue(controller: ReadableStreamDefaultController, obj: object) {
  controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
}

// --- Anthropic streaming ---

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function streamAnthropic(
  model: string,
  systemPrompt: string,
  messages: any[],
  controller: ReadableStreamDefaultController
) {
  const built = buildAnthropicMessages(messages)
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8096,
    system: systemPrompt,
    messages: built,
    stream: true,
  })

  let usage = { inputTokens: 0, outputTokens: 0 }
  for await (const event of response) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      enqueue(controller, { type: 'text', text: event.delta.text })
    }
    if (event.type === 'message_start') usage.inputTokens = event.message.usage.input_tokens
    if (event.type === 'message_delta') usage.outputTokens = event.usage.output_tokens
  }
  enqueue(controller, { type: 'usage', usage })
}

// --- OpenAI-compatible streaming (Gemini / Groq) ---

async function streamOpenAICompat(
  endpoint: string,
  apiKey: string,
  model: string,
  oaiMessages: any[],
  controller: ReadableStreamDefaultController,
  providerName: string
) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: oaiMessages,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 8192,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`${providerName} API error ${res.status}: ${errText}`)
  }

  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let usage = { inputTokens: 0, outputTokens: 0 }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })

    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta?.content
        if (delta) enqueue(controller, { type: 'text', text: delta })
        if (json.usage) {
          usage = {
            inputTokens: json.usage.prompt_tokens ?? usage.inputTokens,
            outputTokens: json.usage.completion_tokens ?? usage.outputTokens,
          }
        }
      } catch { /* malformed line */ }
    }
  }

  enqueue(controller, { type: 'usage', usage })
}

// --- Route handler ---

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, model, systemPrompt, supportsVision } = body

    if (!model) return Response.json({ error: 'model is required' }, { status: 400 })

    const provider = detectProvider(model)
    const sys = buildSystemPrompt(systemPrompt)

    const stream = makeStream(async (controller) => {
      try {
        if (provider === 'anthropic') {
          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your Vercel environment variables.')
          await streamAnthropic(model, sys, messages, controller)

        } else if (provider === 'google') {
          const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
          if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add it to Vercel.')
          const oaiMessages = buildOpenAIMessages(sys, messages, !!supportsVision)
          await streamOpenAICompat(
            'https://generativelanguage.googleapis.com/v1beta/openai',
            apiKey,
            model,
            oaiMessages,
            controller,
            'Gemini',
          )

        } else if (provider === 'groq') {
          const apiKey = process.env.GROQ_API_KEY
          if (!apiKey) throw new Error('GROQ_API_KEY is not set. Get a free key at console.groq.com and add it to Vercel.')
          const oaiMessages = buildOpenAIMessages(sys, messages, false)
          await streamOpenAICompat(
            'https://api.groq.com/openai/v1',
            apiKey,
            model,
            oaiMessages,
            controller,
            'Groq',
          )
        }
      } catch (err: any) {
        enqueue(controller, { type: 'error', error: err.message || 'Unknown error' })
      } finally {
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
