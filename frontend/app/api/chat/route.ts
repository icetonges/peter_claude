import Anthropic from '@anthropic-ai/sdk'
type MessageParam = Anthropic.MessageParam
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(modelId: string): 'anthropic' | 'google' | 'groq' {
  if (modelId.startsWith('gemini')) return 'google'
  if (
    modelId.startsWith('llama') ||
    modelId.startsWith('meta-llama/') ||
    modelId.startsWith('mixtral') ||
    modelId.startsWith('gemma') ||
    modelId.startsWith('groq/') ||
    modelId === 'compound-beta' ||
    modelId === 'compound-beta-mini'
  ) return 'groq'
  return 'anthropic'
}

// Strip internal 'groq/' namespace prefix → Groq API uses bare names
function toGroqModelId(id: string): string {
  return id.startsWith('groq/') ? id.slice(5) : id
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(custom?: string, webSearch?: boolean): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'

  const dateLine = `Today is ${dateStr} (${timeStr}).`
  const searchHint = webSearch
    ? ' You have real-time web search capability. When asked about current events, recent news, prices, or any time-sensitive information, proactively use web search to get fresh data and cite your sources.'
    : ''

  if (custom) return `${dateLine}${searchHint}\n\n${custom}`
  return `You are a helpful, knowledgeable AI assistant. ${dateLine}${searchHint}`
}

// ─── Message builders ─────────────────────────────────────────────────────────

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
      const hasFiles = msg.attachments?.some((a: any) => !a.type.startsWith('image/'))
      if (hasImages || hasFiles) {
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

function buildGeminiContents(messages: any[]) {
  return messages.map((msg: any) => {
    if (msg.role === 'user') {
      const parts: any[] = []
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.type.startsWith('image/')) {
            parts.push({ inline_data: { mime_type: att.type, data: att.data } })
          } else {
            parts.push({ text: `[File: ${att.name}]\n${Buffer.from(att.data, 'base64').toString('utf-8')}` })
          }
        }
      }
      parts.push({ text: msg.content || '' })
      return { role: 'user', parts }
    }
    return { role: 'model', parts: [{ text: msg.content || '' }] }
  })
}

// ─── Stream helpers ───────────────────────────────────────────────────────────

const encoder = new TextEncoder()

function makeStream(fn: (ctrl: ReadableStreamDefaultController) => Promise<void>) {
  return new ReadableStream({ start: fn })
}

function enqueue(ctrl: ReadableStreamDefaultController, obj: object) {
  ctrl.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
}

// ─── Anthropic — standard streaming (no web search) ──────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function streamAnthropic(
  model: string,
  sys: string,
  messages: any[],
  ctrl: ReadableStreamDefaultController,
) {
  const built = buildAnthropicMessages(messages)
  const response = await anthropic.messages.create({
    model, max_tokens: 8096, system: sys, messages: built, stream: true,
  })
  let usage = { inputTokens: 0, outputTokens: 0 }
  for await (const event of response) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta')
      enqueue(ctrl, { type: 'text', text: event.delta.text })
    if (event.type === 'message_start') usage.inputTokens = event.message.usage.input_tokens
    if (event.type === 'message_delta') usage.outputTokens = event.usage.output_tokens
  }
  enqueue(ctrl, { type: 'usage', usage })
}

// ─── Anthropic — web search (beta tool: web_search_20250305) ─────────────────
// Uses the same beta tool that Claude.ai / Claude Code uses for real web search.
// The model decides when to search; results are injected automatically by Anthropic.

async function streamAnthropicWebSearch(
  model: string,
  sys: string,
  messages: any[],
  ctrl: ReadableStreamDefaultController,
) {
  const built = buildAnthropicMessages(messages)
  // @ts-ignore — beta API typings; works at runtime
  const response = await anthropic.beta.messages.create({
    model,
    max_tokens: 8096,
    system: sys,
    messages: built,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    stream: true,
    betas: ['web-search-2025-03-05'],
  })

  let usage = { inputTokens: 0, outputTokens: 0 }

  for await (const event of response as any) {
    // Show live searching status
    if (event.type === 'content_block_start') {
      const block = event.content_block
      if (block?.type === 'server_tool_use' && block?.name === 'web_search') {
        const query = block?.input?.query ?? ''
        enqueue(ctrl, { type: 'searching', status: `Searching: "${query}"` })
      }
      if (block?.type === 'web_search_tool_result') {
        enqueue(ctrl, { type: 'searching', status: 'Analyzing results…' })
      }
    }

    // Stream text deltas
    if (event.type === 'content_block_delta') {
      if (event.delta?.type === 'text_delta') {
        enqueue(ctrl, { type: 'text', text: event.delta.text })
      }
    }

    // Usage
    if (event.type === 'message_start') usage.inputTokens = event.message?.usage?.input_tokens ?? 0
    if (event.type === 'message_delta') usage.outputTokens = event.usage?.output_tokens ?? 0
  }

  enqueue(ctrl, { type: 'usage', usage })
}

// ─── OpenAI-compat streaming (Groq / Gemini OpenAI endpoint) ─────────────────

async function streamOpenAICompat(
  endpoint: string,
  apiKey: string,
  model: string,
  oaiMessages: any[],
  ctrl: ReadableStreamDefaultController,
  providerName: string,
) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages: oaiMessages, stream: true,
      stream_options: { include_usage: true }, max_tokens: 8192,
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
      const t = line.trim()
      if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue
      try {
        const json = JSON.parse(t.slice(6))
        const delta = json.choices?.[0]?.delta?.content
        if (delta) enqueue(ctrl, { type: 'text', text: delta })
        if (json.usage) {
          usage = {
            inputTokens: json.usage.prompt_tokens ?? usage.inputTokens,
            outputTokens: json.usage.completion_tokens ?? usage.outputTokens,
          }
        }
      } catch { /* malformed */ }
    }
  }
  enqueue(ctrl, { type: 'usage', usage })
}

// ─── Gemini native streaming (Google Search grounding) ───────────────────────

async function streamGeminiNative(
  model: string,
  apiKey: string,
  sys: string,
  messages: any[],
  webSearch: boolean,
  ctrl: ReadableStreamDefaultController,
) {
  const contents = buildGeminiContents(messages)
  const body: any = {
    contents,
    system_instruction: { parts: [{ text: sys }] },
    generationConfig: { maxOutputTokens: 8192 },
  }
  if (webSearch) {
    body.tools = [{ google_search: {} }]
    enqueue(ctrl, { type: 'searching', status: 'Searching Google…' })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let inputTokens = 0, outputTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue
      try {
        const json = JSON.parse(t.slice(6))
        const parts = json.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
          if (part.text) enqueue(ctrl, { type: 'text', text: part.text })
        }
        if (json.usageMetadata) {
          inputTokens = json.usageMetadata.promptTokenCount ?? inputTokens
          outputTokens = json.usageMetadata.candidatesTokenCount ?? outputTokens
        }
      } catch { /* malformed */ }
    }
  }
  enqueue(ctrl, { type: 'usage', usage: { inputTokens, outputTokens } })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, model, systemPrompt, supportsVision, webSearch } = body

    if (!model) return Response.json({ error: 'model is required' }, { status: 400 })

    const provider = detectProvider(model)
    const sys = buildSystemPrompt(systemPrompt, webSearch)

    const stream = makeStream(async (ctrl) => {
      try {
        // ── Anthropic ────────────────────────────────────────────────────────
        if (provider === 'anthropic') {
          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your Vercel environment variables.')
          if (webSearch) {
            // Use Anthropic's native web_search_20250305 beta tool —
            // same mechanism as Claude.ai and Claude Code
            await streamAnthropicWebSearch(model, sys, messages, ctrl)
          } else {
            await streamAnthropic(model, sys, messages, ctrl)
          }

        // ── Google Gemini ────────────────────────────────────────────────────
        } else if (provider === 'google') {
          const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
          if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com.')
          if (webSearch) {
            // Gemini native API with Google Search grounding
            await streamGeminiNative(model, apiKey, sys, messages, true, ctrl)
          } else {
            // OpenAI-compat endpoint for regular requests
            const oaiMessages = buildOpenAIMessages(sys, messages, !!supportsVision)
            await streamOpenAICompat(
              'https://generativelanguage.googleapis.com/v1beta/openai',
              apiKey, model, oaiMessages, ctrl, 'Gemini',
            )
          }

        // ── Groq / Llama / compound-beta ────────────────────────────────────
        } else if (provider === 'groq') {
          const apiKey = process.env.GROQ_API_KEY
          if (!apiKey) throw new Error('GROQ_API_KEY is not set. Get a free key at console.groq.com.')
          // Strip internal 'groq/' namespace prefix — Groq API uses bare names
          // e.g. 'groq/compound-beta' → 'compound-beta'
          const groqModel = webSearch ? 'compound-beta' : toGroqModelId(model)
          if (webSearch) enqueue(ctrl, { type: 'searching', status: 'Searching with Compound Beta…' })
          const oaiMessages = buildOpenAIMessages(sys, messages, false)
          await streamOpenAICompat('https://api.groq.com/openai/v1', apiKey, groqModel, oaiMessages, ctrl, 'Groq')
        }
      } catch (err: any) {
        enqueue(ctrl, { type: 'error', error: err.message || 'Unknown error' })
      } finally {
        ctrl.close()
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
