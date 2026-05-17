import Anthropic from '@anthropic-ai/sdk'
type MessageParam = Anthropic.MessageParam
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

// --- Provider detection (uses full model ID including groq/ prefix) ---

function detectProvider(modelId: string): 'anthropic' | 'google' | 'groq' {
  if (modelId.startsWith('gemini')) return 'google'
  if (
    modelId.startsWith('llama') ||
    modelId.startsWith('meta-llama/') ||
    modelId.startsWith('mixtral') ||
    modelId.startsWith('gemma') ||
    modelId.startsWith('qwen') ||
    modelId.startsWith('deepseek') ||
    modelId.startsWith('groq/') ||
    modelId === 'compound-beta' ||
    modelId === 'compound-beta-mini'
  ) return 'groq'
  return 'anthropic'
}

// Strip internal 'groq/' namespace prefix before sending to Groq API
// e.g. 'groq/compound-beta' → 'compound-beta'
function toGroqModelId(modelId: string): string {
  return modelId.startsWith('groq/') ? modelId.slice(5) : modelId
}

// --- System prompt builder ---

function buildSystemPrompt(custom?: string, webSearch?: boolean): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'

  const dateLine = `Today is ${dateStr} (${timeStr}).`

  if (custom) {
    // Prepend date to custom system prompt
    return `${dateLine}\n\n${custom}`
  }

  const base = `You are a helpful, knowledgeable AI assistant. ${dateLine} You can answer questions about current events up to your knowledge cutoff, and you always let users know when information may be outdated.`

  if (webSearch) {
    return base + '\n\nYou have access to real-time web search. When asked about current events, recent news, or any information that might have changed, proactively search the web and base your answer on fresh results. Always cite the sources you found.'
  }

  return base
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

// Build Gemini native API content array
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

// --- OpenAI-compatible streaming (Groq / Gemini OpenAI-compat) ---

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

// --- Gemini native streaming (supports Google Search grounding) ---

async function streamGeminiNative(
  model: string,
  apiKey: string,
  systemPrompt: string,
  messages: any[],
  webSearch: boolean,
  controller: ReadableStreamDefaultController
) {
  const contents = buildGeminiContents(messages)

  const body: any = {
    contents,
    system_instruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: 8192 },
  }

  // Enable Google Search grounding when web search is requested
  if (webSearch) {
    body.tools = [{ google_search: {} }]
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
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        // Extract text from candidates
        const parts = json.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
          if (part.text) enqueue(controller, { type: 'text', text: part.text })
        }
        // Extract grounding sources if present
        const groundingMeta = json.candidates?.[0]?.groundingMetadata
        if (groundingMeta?.webSearchQueries?.length) {
          // Optionally send search queries as metadata
          enqueue(controller, { type: 'grounding', queries: groundingMeta.webSearchQueries })
        }
        // Usage metadata
        if (json.usageMetadata) {
          inputTokens = json.usageMetadata.promptTokenCount ?? inputTokens
          outputTokens = json.usageMetadata.candidatesTokenCount ?? outputTokens
        }
      } catch { /* malformed */ }
    }
  }
  enqueue(controller, { type: 'usage', usage: { inputTokens, outputTokens } })
}

// --- Route handler ---

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, model: requestedModel, systemPrompt, supportsVision, webSearch } = body

    if (!requestedModel) return Response.json({ error: 'model is required' }, { status: 400 })

    // Determine effective model — if web search requested, route to compound-beta on Groq
    // (compound-beta has built-in real-time web search)
    const groqKey = process.env.GROQ_API_KEY
    const useCompound = webSearch && groqKey

    // If web search on Gemini: use native Gemini API with Google Search grounding
    // If web search on any non-Groq model without groq key: fall back to native Gemini grounding
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    const requestedProvider = detectProvider(requestedModel)
    const useGeminiGrounding = webSearch && requestedProvider === 'google' && geminiKey

    let model = requestedModel
    let provider = requestedProvider

    // Force compound-beta when web search is on and we're not on Gemini (Gemini has its own grounding)
    if (useCompound && !useGeminiGrounding) {
      model = 'compound-beta'
      provider = 'groq'
    }

    const sys = buildSystemPrompt(systemPrompt, webSearch)

    const stream = makeStream(async (controller) => {
      try {
        if (provider === 'anthropic') {
          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your Vercel environment variables.')
          await streamAnthropic(model, sys, messages, controller)

        } else if (provider === 'google') {
          if (!geminiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add it to Vercel.')

          if (webSearch) {
            // Use native Gemini API with Google Search grounding
            await streamGeminiNative(model, geminiKey, sys, messages, true, controller)
          } else {
            // Use OpenAI-compatible endpoint for non-search requests
            const oaiMessages = buildOpenAIMessages(sys, messages, !!supportsVision)
            await streamOpenAICompat(
              'https://generativelanguage.googleapis.com/v1beta/openai',
              geminiKey,
              model,
              oaiMessages,
              controller,
              'Gemini',
            )
          }

        } else if (provider === 'groq') {
          if (!groqKey) throw new Error('GROQ_API_KEY is not set. Get a free key at console.groq.com and add it to Vercel.')
          // CRITICAL: strip 'groq/' internal prefix — Groq API uses bare model names
          // 'groq/compound-beta' → 'compound-beta', 'llama-3.3-70b-versatile' stays as-is
          const groqModelId = toGroqModelId(model)
          const oaiMessages = buildOpenAIMessages(sys, messages, false)
          await streamOpenAICompat(
            'https://api.groq.com/openai/v1',
            groqKey,
            groqModelId,
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
