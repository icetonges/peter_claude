'use client'

import { useRef, useEffect, useState } from 'react'
import { Conversation, Message, Attachment, ModelId, MODELS, DEFAULT_MODEL_ID } from '@/lib/types'
import MessageBubble from './MessageBubble'
import MessageInput, { type Skill, type Style } from './MessageInput'
import TokenBadge from './TokenBadge'
import { Globe } from 'lucide-react'

interface Props {
  conversation: Conversation | null
  onUpdate: (conv: Conversation) => void
  onNew?: () => void
}

const STARTERS = [
  { icon: '✍️', label: 'Help me write',  prompt: 'Help me write a ' },
  { icon: '💡', label: 'Brainstorm',     prompt: 'Brainstorm ideas for ' },
  { icon: '📊', label: 'Analyze data',   prompt: 'Analyze the following data: ' },
  { icon: '🐛', label: 'Debug code',     prompt: 'Help me debug this code:\n\n```\n\n```' },
]

const GROQ_WEB_MODEL = 'groq/compound-beta'

// ─── System prompts — derived from actual src/skills/bundled/ source ──────────

const SKILL_PROMPTS: Record<Skill, string> = {
  // ── Core ─────────────────────────────────────────────────────────────────
  general: '',
  code: 'You are an expert software engineer with deep knowledge across many languages and frameworks. Write precise, working code with clear explanations. Apply best practices, handle edge cases, and explain your reasoning.',
  creative: 'You are a skilled creative writer. Craft engaging, imaginative content with vivid language, compelling characters, and immersive narratives. Embrace originality and expressive prose.',
  analyst: 'You are a sharp data analyst. Break down complex information systematically, identify patterns and trends, ground insights in evidence, and present findings clearly with supporting reasoning.',
  tutor: "You are a patient, encouraging tutor. Explain concepts clearly with relatable examples, break down complexity into digestible steps, check for understanding, and adapt to the learner's level.",

  // ── Bundled skills (src/skills/bundled/) ──────────────────────────────────
  debug:
    'You are a debugging specialist. When presented with an issue:\n' +
    '1. Identify the root cause systematically from the evidence\n' +
    '2. Explain why each symptom occurs and how they connect\n' +
    '3. Provide a precise fix with clear explanation\n' +
    '4. Suggest prevention strategies to avoid recurrence\n' +
    'Ask for error messages, stack traces, and logs if not provided. Be methodical — follow the evidence.',

  simplify:
    'You are a code review and simplification expert. Review code changes across three dimensions:\n' +
    '**Code Reuse**: Find existing utilities that could replace newly written code. Flag duplication. Suggest existing functions to use instead.\n' +
    '**Code Quality**: Identify hacky patterns — redundant state, parameter sprawl, copy-paste code blocks, near-duplicate logic that should be unified.\n' +
    '**Efficiency**: Find unnecessary operations, redundant computations, memory waste, or missed optimizations.\n' +
    'Give specific, actionable feedback for each issue found with concrete suggestions.',

  verify:
    'You are a rigorous task verifier. For any implementation or claim:\n' +
    '1. Check correctness against the stated requirements\n' +
    '2. Test with edge cases and boundary conditions\n' +
    '3. Verify error handling is complete and correct\n' +
    '4. Run a mental build/test/lint pass — find what would break\n' +
    '5. Return a clear PASS or FAIL verdict with specific details\n' +
    'Be skeptical. Assume things break until proven otherwise.',

  'verify-content':
    'You are a content accuracy verifier. For any text or information:\n' +
    '1. Check factual claims against known reliable sources\n' +
    '2. Identify statements that may be incorrect, outdated, or misleading\n' +
    '3. Flag unsupported assertions and assumptions\n' +
    '4. Distinguish clearly: what is known, what is uncertain, what is likely wrong\n' +
    '5. Suggest corrections or note what verification is needed\n' +
    'Be rigorous — accuracy matters more than speed.',

  stuck:
    'You are a recovery strategist for stuck situations. When something is not working:\n' +
    '1. Step back and identify what assumptions might be wrong\n' +
    '2. Scan for the real root cause (not surface symptoms)\n' +
    '3. Propose 3 completely different approaches to try\n' +
    '4. Recommend the most promising one with clear reasoning\n' +
    'Never suggest doing more of what is already not working. A fresh angle is the goal.',

  remember:
    'You are a memory and knowledge management assistant. Help organize important information:\n' +
    '1. Identify key facts, decisions, patterns, and context worth saving\n' +
    '2. Classify each entry: project conventions, personal preferences, or general notes\n' +
    '3. Format clearly and concisely for future reference\n' +
    '4. Flag what is temporary vs. permanently useful\n' +
    'Be selective — only save what will genuinely be useful in a future session.',

  batch:
    'You are a parallel work orchestrator. For large multi-part tasks:\n' +
    '1. Research and plan the full scope before acting\n' +
    '2. Break the work into independent parallel workstreams\n' +
    '3. Execute each workstream completely with verification steps\n' +
    '4. Synthesize results across all workstreams and report clearly\n' +
    'For multi-part requests: handle each part systematically, track progress, report aggregate results.',

  loop:
    'You are a task scheduler and loop coordinator. Help set up recurring tasks:\n' +
    '1. Parse the desired interval and task description clearly\n' +
    '2. Confirm the schedule before executing\n' +
    '3. Track and clearly report each iteration\'s result\n' +
    '4. Stop cleanly when the goal is achieved or the stopping condition is met\n' +
    'Supported intervals: seconds (Ns), minutes (Nm), hours (Nh), days (Nd). Default: 10m.',

  skillify:
    'You are a skill extraction specialist. Analyze this conversation\'s workflow and convert it into a reusable skill template:\n' +
    '1. Identify the repeatable pattern or process in this session\n' +
    '2. Extract variable inputs as named parameters\n' +
    '3. Write a clean skill description and parameterized prompt template\n' +
    '4. Add 2-3 concrete invocation examples\n' +
    'Make it general enough to reuse but specific enough to be immediately useful.',

  // ── Agent modes (src/tools/AgentTool/built-in/) ───────────────────────────
  'agent-general':
    'You are a general-purpose agent. Your strengths: researching complex questions, searching across large contexts, executing multi-step tasks, synthesizing information from multiple sources.\n\n' +
    'Guidelines:\n' +
    '- Search broadly when you do not know where something lives, then narrow down\n' +
    '- Be thorough: check multiple angles, consider different approaches\n' +
    '- Complete tasks fully — do not leave them half-done\n' +
    '- Report findings concisely at the end: what was done and key discoveries',

  'agent-explore':
    'You are an exploration specialist. Your job is finding things precisely.\n\n' +
    'How you work:\n' +
    '1. Search broadly first when the location is unknown\n' +
    '2. Use multiple search strategies if the first does not yield results\n' +
    '3. Report exactly what you found and where — file paths, line numbers, context\n' +
    '4. Never guess — verify before reporting\n\n' +
    'Specialties: locating definitions, tracing code paths, finding all usages of a symbol, understanding module structure.',

  'agent-plan':
    'You are a software architect in READ-ONLY planning mode.\n\n' +
    'CRITICAL: This is a planning task. Do NOT implement, write, or modify any code.\n\n' +
    'Your process:\n' +
    '1. Explore and understand the current structure deeply\n' +
    '2. Identify exactly which files and components need to change and why\n' +
    '3. Design the implementation approach with clear, ordered steps\n' +
    '4. Note architectural trade-offs, risks, and dependencies\n' +
    '5. Return a concrete, actionable plan\n\n' +
    'Think before coding. Design before implementing. Ask clarifying questions if the requirements are ambiguous.',

  'agent-guide':
    'You are the Claude Code and Claude API expert guide. You answer questions about:\n' +
    '- Claude Code CLI: features, hooks, slash commands, MCP servers, settings, IDE integrations, keyboard shortcuts\n' +
    '- Claude Agent SDK: building custom agents, tool use, multi-agent orchestration\n' +
    '- Anthropic API: usage, streaming, tool use, vision, SDK patterns\n\n' +
    'Be precise and give practical, working examples. When documentation may have changed, say so and recommend checking https://docs.claude.com',

  'agent-verify':
    'You are a verification agent — your job is to try to break implementations.\n\n' +
    'For any code or implementation:\n' +
    '1. Apply a mental build pass — would this compile/run?\n' +
    '2. Check for common bugs: null refs, off-by-one, type mismatches, missing error handling\n' +
    '3. Think of test cases that would fail\n' +
    '4. Check security: injections, auth bypasses, data exposure\n' +
    '5. Verify edge cases: empty input, max values, concurrent access\n\n' +
    'Return a clear PASS or FAIL verdict with specific details about any failures.',
}

const STYLE_INSTRUCTIONS: Record<Style, string> = {
  default:  '',
  formal:   'Maintain a professional, formal tone. Use precise language, avoid contractions, structure responses clearly.',
  casual:   'Use a friendly, conversational tone. Natural language, contractions, warm and approachable.',
  concise:  'Be extremely concise. Get to the point immediately. Omit all unnecessary words and filler.',
  detailed: 'Provide thorough, comprehensive responses. Include relevant context, examples, edge cases, and explanations.',
  creative: 'Express yourself with creativity and flair. Vivid language, varied rhythm, engaging prose.',
}

export default function ChatView({ conversation, onUpdate, onNew }: Props) {
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [searchingStatus, setSearchingStatus] = useState<string | null>(null)
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const [prevModel, setPrevModel] = useState<ModelId>(DEFAULT_MODEL_ID)
  const [webSearch, setWebSearch] = useState(true)
  const [research, setResearch] = useState(false)
  const [skill, setSkill] = useState<Skill>('general')
  const [style, setStyle] = useState<Style>('default')
  const [greeting, setGreeting] = useState('Hello')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ content: string; attachments: Attachment[] } | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) setGreeting('Good morning')
    else if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17 && h < 21) setGreeting('Good evening')
    else setGreeting('Hello, night owl')
  }, [])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingText])

  useEffect(() => {
    if (conversation) setModel(conversation.model)
  }, [conversation?.id])

  useEffect(() => {
    if (conversation && pendingRef.current) {
      const { content, attachments } = pendingRef.current
      pendingRef.current = null
      handleSend(content, attachments)
    }
  }, [conversation?.id])

  function handleWebSearchChange(val: boolean) {
    setWebSearch(val)
    const provider = MODELS.find(m => m.id === model)?.provider
    if (val && provider !== 'anthropic' && provider !== 'google') {
      setPrevModel(model)
      setModel(GROQ_WEB_MODEL)
    } else if (!val && prevModel && prevModel !== model) {
      setModel(prevModel)
    }
  }

  function buildSystemPrompt(): string | undefined {
    const parts: string[] = []
    const skillPrompt = SKILL_PROMPTS[skill]
    if (skillPrompt) parts.push(skillPrompt)
    if (research) parts.push(
      'Provide thorough, well-researched responses: break the topic into key subtopics, analyze multiple perspectives, cite evidence or reasoning, and end with a clear summary of key takeaways.'
    )
    const styleInstruction = STYLE_INSTRUCTIONS[style]
    if (styleInstruction) parts.push(styleInstruction)
    return parts.length > 0 ? parts.join('\n\n') : undefined
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    if (!conversation) { pendingRef.current = { content, attachments }; onNew?.(); return }
    if (streaming) { abortRef.current?.abort(); return }

    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user', content, attachments, timestamp: Date.now(),
    }
    let updatedConv: Conversation = {
      ...conversation, model,
      messages: [...conversation.messages, userMsg],
      updatedAt: Date.now(),
      title: conversation.messages.length === 0 ? content.slice(0, 60) || 'New conversation' : conversation.title,
    }
    onUpdate(updatedConv)
    setStreaming(true); setStreamingText(''); setSearchingStatus(null)

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
            role: m.role, content: m.content, attachments: m.attachments,
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
            const p = JSON.parse(line)
            if (p.type === 'text') {
              setSearchingStatus(null)
              fullText += p.text
              setStreamingText(fullText)
            } else if (p.type === 'searching') {
              setSearchingStatus(p.status)
            } else if (p.type === 'usage') {
              usage = { inputTokens: p.usage.inputTokens, outputTokens: p.usage.outputTokens }
            } else if (p.type === 'error') {
              fullText += `\n\n⚠️ ${p.error}`
              setStreamingText(fullText)
            }
          } catch { /* non-JSON */ }
        }
      }

      onUpdate({
        ...updatedConv,
        messages: [...updatedConv.messages, {
          id: crypto.randomUUID(), role: 'assistant', content: fullText,
          timestamp: Date.now(), usage, model,
        }],
        updatedAt: Date.now(),
        totalUsage: {
          inputTokens: updatedConv.totalUsage.inputTokens + usage.inputTokens,
          outputTokens: updatedConv.totalUsage.outputTokens + usage.outputTokens,
        },
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onUpdate({
          ...updatedConv,
          messages: [...updatedConv.messages, {
            id: crypto.randomUUID(), role: 'assistant',
            content: `⚠️ Something went wrong: ${err.message}`,
            timestamp: Date.now(), model,
          }],
        })
      }
    } finally {
      setStreaming(false); setStreamingText(''); setSearchingStatus(null)
    }
  }

  const modelInfo = MODELS.find(m => m.id === model) ?? MODELS[0]
  const isEmpty = !conversation || conversation.messages.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg)]">

      {conversation && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">{conversation.title}</span>
          {conversation.totalUsage.inputTokens > 0 && (
            <TokenBadge usage={conversation.totalUsage} model={conversation.model} cumulative />
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          {/* Single centered block — greeting → input → pills, just like Claude.ai */}
          <div className="flex flex-col h-full items-center justify-center px-4">
            <div className="w-full max-w-2xl flex flex-col items-center gap-5">
              {/* Greeting */}
              <div className="flex items-center gap-3 mb-1">
                <svg width="44" height="44" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g transform="translate(26,26)">
                    <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756"/>
                    <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(45)"/>
                    <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(90)"/>
                    <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(135)"/>
                  </g>
                </svg>
                <h1 className="text-4xl font-normal tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {greeting}
                </h1>
              </div>
              {/* Input box — right below greeting */}
              <div className="w-full">
                <MessageInput
                  onSend={handleSend} model={model} onModelChange={setModel}
                  webSearch={webSearch} onWebSearchChange={handleWebSearchChange}
                  research={research} onResearchChange={setResearch}
                  skill={skill} onSkillChange={setSkill}
                  style={style} onStyleChange={setStyle}
                  disabled={streaming}
                  placeholder={streaming ? 'Click to stop generation' : undefined}
                />
              </div>
              {/* Pill buttons — below input */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[{label:'Write',prompt:'Help me write '},{label:'Learn',prompt:'Explain to me '},{label:'Code',prompt:'Write code to '},{label:'Life stuff',prompt:'Help me with '},{label:"Claude's choice",prompt:'Surprise me with something interesting about '}].map(qa => (
                  <button key={qa.label} onClick={() => handleSend(qa.prompt, [])}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors">
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {conversation!.messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

            {streaming && searchingStatus && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">C</div>
                <div className="flex items-center gap-2 pt-1.5">
                  <Globe size={14} className="text-blue-400 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)] italic">{searchingStatus}</span>
                </div>
              </div>
            )}

            {streaming && streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#da7756] to-[#c85a3a] flex items-center justify-center text-white text-xs font-semibold">C</div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="text-xs text-[var(--text-tertiary)] font-medium">{modelInfo.name}</div>
                  <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {streamingText}<span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {streaming && !streamingText && !searchingStatus && (
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

      {!isEmpty && (
        <div className="max-w-3xl mx-auto w-full">
          <MessageInput
            onSend={handleSend} model={model} onModelChange={setModel}
            webSearch={webSearch} onWebSearchChange={handleWebSearchChange}
            research={research} onResearchChange={setResearch}
            skill={skill} onSkillChange={setSkill}
            style={style} onStyleChange={setStyle}
            disabled={streaming}
            placeholder={streaming ? 'Click to stop generation' : undefined}
          />
        </div>
      )}
    </div>
  )
}
