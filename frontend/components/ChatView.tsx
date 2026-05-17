'use client'

import { useRef, useEffect, useState } from 'react'
import { Conversation, Message, Attachment, ModelId, MODELS, DEFAULT_MODEL_ID } from '@/lib/types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import TokenBadge from './TokenBadge'
import { Sparkles } from 'lucide-react'

interface Props {
  conversation: Conversation | null
  onUpdate: (conv: Conversation) => void
}

const STARTERS = [
  { icon: '✍️', label: 'Help me write', prompt: 'Help me write a ' },
  { icon: '💡', label: 'Brainstorm ideas', prompt: 'Brainstorm ideas for ' },
  { icon: '📊', label: 'Analyze data', prompt: 'Analyze the following data: ' },
  { icon: '🐛', label: 'Debug code', prompt: 'Help me debug this code:\n\n```\n\n```' },
]

// When web search is on, route to the compound-beta model (has built-in web search)
const WEB_SEARCH_MODEL = 'groq/compound-beta'

export default function ChatView({ conversation, onUpdate }: Props) {
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const [webSearch, setWebSearch] = useState(false)
  const [research, setResearch] = useState(false)
  const [prevModel, setPrevModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Scroll to bottom on new messages or stream updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingText])

  // Sync model from conversation
  useEffect(() => {
    if (conversation) setModel(conversation.model)
  }, [conversation?.id])

  // Switch model when web search toggled
  function handleWebSearchChange(val: boolean) {
    setWebSearch(val)
    if (val) {
      setPrevModel(model)
      setModel(WEB_SEARCH_MODEL)
    } else {
      setModel(prevModel)
    }
  }

  // Build an augmented system prompt for research mode
  function buildSystemPrompt(): string | undefined {
    if (!research) return undefined
    return `You are a thorough research assistant. When answering, you:
1. Break down the topic into key subtopics
2. Provide well-structured, detailed analysis with evidence and reasoning
3. Cite sources or note when claims are uncertain
4. Summarize key takeaways at the end
Be comprehensive but clear and well-organized.`
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    if (!conversation) return
    if (streaming) {
      abortRef.current?.abort()
      return
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    }

    let updatedConv: Conversation = {
      ...conversation,
      model,
      messages: [...conversation.messages, userMsg],
      updatedAt: Date.now(),
      title:
        conversation.messages.length === 0
          ? content.slice(0, 60) || 'New conversation'
          : conversation.title,
    }
    onUpdate(updatedConv)

    setStreaming(true)
    setStreamingText('')

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          model,
          supportsVision: MODELS.find(m => m.id === model)?.supportsVision ?? false,
          systemPrompt: buildSystemPrompt(),
          messages: updatedConv.messages.map(m => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
        }),
      })

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let usage = { inputTokens: 0, outputTokens: 0 }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.type === 'text') {
              fullText += parsed.text
              setStreamingText(fullText)
            } else if (parsed.type === 'usage') {
              usage = { inputTokens: parsed.usage.inputTokens, outputTokens: parsed.usage.outputTokens }
            } else if (parsed.type === 'error') {
              fullText += `\n\n⚠️ Error: ${parsed.error}`
              setStreamingText(fullText)
            }
          } catch { /* non-JSON line */ }
        }
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        usage,
        model,
      }

      updatedConv = {
        ...updatedConv,
        messages: [...updatedConv.messages, assistantMsg],
        updatedAt: Date.now(),
        totalUsage: {
          inputTokens: updatedConv.totalUsage.inputTokens + usage.inputTokens,
          outputTokens: updatedConv.totalUsage.outputTokens + usage.outputTokens,
        },
      }
      onUpdate(updatedConv)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Something went wrong: ${err.message}`,
          timestamp: Date.now(),
          model,
        }
        onUpdate({ ...updatedConv, messages: [...updatedConv.messages, errorMsg] })
      }
    } finally {
      setStreaming(false)
      setStreamingText('')
    }
  }

  const modelInfo = MODELS.find(m => m.id === model) ?? MODELS[0]
  const isEmpty = !conversation || conversation.messages.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg)]">
      {/* Top bar */}
      {conversation && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">
              {conversation.title}
            </span>
          </div>
          {conversation.totalUsage.inputTokens > 0 && (
            <TokenBadge usage={conversation.totalUsage} model={conversation.model} cumulative />
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center shadow-lg">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">How can I help you?</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Powered by {modelInfo.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {STARTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => conversation && handleSend(s.prompt, [])}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-left text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {conversation!.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming message */}
            {streaming && streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">
                  C
                </div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="text-xs text-[var(--text-tertiary)] font-medium">{modelInfo.name}</div>
                  <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator (no text yet) */}
            {streaming && !streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">
                  C
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <MessageInput
          onSend={handleSend}
          model={model}
          onModelChange={setModel}
          webSearch={webSearch}
          onWebSearchChange={handleWebSearchChange}
          research={research}
          onResearchChange={setResearch}
          disabled={!conversation}
          placeholder={streaming ? 'Claude is thinking… (click to cancel)' : undefined}
        />
      </div>
    </div>
  )
}
