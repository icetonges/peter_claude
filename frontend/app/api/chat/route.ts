import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, model, systemPrompt } = body

    // Build Anthropic message array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anthropicMessages: any[] = messages.map((msg: any) => {
      if (msg.role === 'user') {
        const content: any[] = []

        // Add attachments first (images / files)
        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            if (att.type.startsWith('image/')) {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: att.type,
                  data: att.data,
                },
              })
            } else {
              // Text file – embed as text block
              content.push({
                type: 'text',
                text: `[File: ${att.name}]\n${atob(att.data)}`,
              })
            }
          }
        }

        content.push({ type: 'text', text: msg.content })
        return { role: 'user', content }
      }

      return { role: 'assistant', content: msg.content }
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model,
            max_tokens: 8096,
            system: systemPrompt || 'You are Claude, a helpful AI assistant made by Anthropic.',
            messages: anthropicMessages,
            stream: true,
          })

          let usage = { inputTokens: 0, outputTokens: 0 }

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = JSON.stringify({ type: 'text', text: event.delta.text }) + '\n'
              controller.enqueue(encoder.encode(chunk))
            }
            if (event.type === 'message_delta' && event.usage) {
              usage.outputTokens = event.usage.output_tokens
            }
            if (event.type === 'message_start' && event.message.usage) {
              usage.inputTokens = event.message.usage.input_tokens
            }
          }

          // Send usage at the end
          const usageChunk = JSON.stringify({ type: 'usage', usage }) + '\n'
          controller.enqueue(encoder.encode(usageChunk))
          controller.close()
        } catch (err: any) {
          const errChunk = JSON.stringify({ type: 'error', error: err.message || 'Unknown error' }) + '\n'
          controller.enqueue(encoder.encode(errChunk))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
