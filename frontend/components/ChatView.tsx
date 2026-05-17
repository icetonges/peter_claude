'use client'

import { useRef, useEffect, useState } from 'react'
import { Conversation, Message, Attachment, ModelId, MODELS, DEFAULT_MODEL_ID } from '@/lib/types'
import MessageBubble from './MessageBubble'
import MessageInput, { Skill, Style } from './MessageInput'
import TokenBadge from './TokenBadge'
import { Sparkles } from 'lucide-react'

interface Props {
  conversation: Conversation | null
  onUpdate: (conv: Conversation) => void
}

const STARTERS = [
  { icon: '✍️', label: 'Help me write',  prompt: 'Help me write a ' },
  { icon: '💡', label: 'Brainstorm',     prompt: 'Brainstorm ideas for ' },
  { icon: '📊', label: 'Analyze data',   prompt: 'Analyze the following data: ' },
  { icon: '🐛', label: 'Debug code',     prompt: 'Help me debug this code:\n\n```\n\n```' },
]

const WEB_SEARCH_MODEL = 'groq/compound-beta'

const SKILL_PROMPTS: Record<Skill, string> = {
  general:  '',
  code:     'You are an expert software engineer with deep knowledge across many languages and frameworks. Write precise, working code with clear explanations. Apply best practices, handle edge cases, and explain your reasoning.',
  creative: 'You are a skilled creative writer. Craft engaging, imaginative content with vivid language, compelling characters, and immersive narratives. Embrace originality and expressive prose.',
  analyst:  'You are a sharp data analyst. Break down complex information systematically, identify patterns and trends, ground insights in evidence, and present findings clearly with supporting reasoning.',
  tutor:    "You are a patient, encouraging tutor. Explain concepts clearly with relatable examples, break down complexity into digestible steps, check for understanding, and adapt your explanations to the learner's level.",
}

const STYLE_INSTRUCTIONS: Record<Style, string> = {
  default:  '',
  formal:   'Maintain a professional, formal tone throughout. Use precise language, avoid contractions, and structure responses clearly.',
  casual:   'Use a friendly, conversational tone. Feel free to use natural language, contractions, and a warm approachable style.',
  concise:  'Be extremely concise. Prioritize brevity — get to the point immediately and omit all unnecessary words and filler.',
  detailed: 'Provide thorough, comprehensive responses. Include relevant context, examples, edge cases, and explanations for each point.',
  creative: 'Express yourself with creativity and flair. Use vivid language, varied sentence rhythm, and engaging prose that draws the reader in.',
}

export default function ChatView({ conversation, onUpdate }: Props) {
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const [prevModel, setPrevModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const [webSearch, setWebSearch] = useState(false)
  const [research, setResearch] = useState(false)
  const [skill, setSkill] = useState<Skill>('general')
  const [style, setStyle] = useState<Style>('default')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingText])

  useEffect(() => {
    if (conversation) setModel(conversation.model)
  }, [conversation?.id])

  function handleWebSearchChange(val: boolean) {
    setWebSearch(val)
    if (val) { setPrevModel(model); setModel(WEB_SEARCH_MODEL) }
    else { setModel(prevModel) }
  }

  function buildSystemPrompt(): string | undefined {
    const parts: string[] = []
    if (skill !== 'general') parts.push(SKILL_PROMPTS[skill])
    if (research) parts.push(
      'Provide thorough, well-researched responses: break the topic into key subtopics, analyze multiple perspectives, cite evidence or reasoning, and end with a clear summary of key takeaways.'
    )
    if (style !== 'default') parts.push(STYLE_INSTRUCTIONS[style])
    return parts.length > 0 ? parts.join('\n\n') : undefined
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    if (!conversation) return
    if (streaming) { abortRef.current?.abort(); return }

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
      title: conversation.messages.length === 0
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
          webSearch,
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
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.type === 'text') { fullText += parsed.text; setStreamingText(fullText) }
            else if (parsed.type === 'usage') usage = { inputTokens: parsed.usage.inputTokens, outputTokens: parsed.usage.outputTokens }
            else if (parsed.type === 'error') { fullText += `\n\n⚠️ Error: ${parsed.error}`; setStreamingText(fullText) }
          } catch { /* non-JSON */ }
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
        onUpdate({
          ...updatedConv,
          messages: [...updatedConv.messages, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Something went wrong: ${err.message}`,
            timestamp: Date.now(),
            model,
          }],
        })
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
          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">{conversation.title}</span>
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
                <button key={s.label}
                  onClick={() => conversation && handleSend(s.prompt, [])}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-left text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">
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

            {streaming && streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">C</div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="text-xs text-[var(--text-tertiary)] font-medium">{modelInfo.name}</div>
                  <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">C</div>
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
          skill={skill}
          onSkillChange={setSkill}
          style={style}
          onStyleChange={setStyle}
          disabled={!conversation}
          placeholder={streaming ? 'Claude is thinking… (click to cancel)' : undefined}
        />
      </div>
    </div>
  )
}
