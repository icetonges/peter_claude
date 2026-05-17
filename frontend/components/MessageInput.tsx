'use client'

import { useRef, useState, useEffect } from 'react'
import { Attachment, ModelId } from '@/lib/types'
import ModelSelector from './ModelSelector'
import {
  Plus, ArrowUp, X, Globe, FlaskConical, Image, Check,
  Camera, ChevronRight, ChevronLeft, Paintbrush,
  Code2, Feather, BarChart2, GraduationCap, Sparkles,
  AlignLeft, AlignJustify, MessageSquare, Briefcase, Wand2,
  Bug, ShieldCheck, Layers, Brain, Repeat, BookMarked,
  Zap, Link, Loader2, Search, Map, BookOpen, Bot, Target,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Skill =
  // Core
  | 'general' | 'code' | 'creative' | 'analyst' | 'tutor'
  // Bundled skills (from src/skills/bundled/)
  | 'debug' | 'simplify' | 'verify' | 'verify-content' | 'stuck'
  | 'remember' | 'batch' | 'loop' | 'skillify'
  // Agent modes (from src/tools/AgentTool/built-in/)
  | 'agent-general' | 'agent-explore' | 'agent-plan'
  | 'agent-guide' | 'agent-verify'

export type Style = 'default' | 'formal' | 'casual' | 'concise' | 'detailed' | 'creative'

// ─── Skill definitions ────────────────────────────────────────────────────────

interface SkillDef { id: Skill; label: string; desc: string; icon: React.ReactNode; color: string }

const CORE_SKILLS: SkillDef[] = [
  { id: 'general',  label: 'General',        desc: 'Balanced assistant',      icon: <Sparkles size={13} />,      color: 'text-[var(--text-secondary)]' },
  { id: 'code',     label: 'Code',           desc: 'Expert programmer',       icon: <Code2 size={13} />,         color: 'text-blue-400' },
  { id: 'creative', label: 'Creative',       desc: 'Vivid storytelling',      icon: <Feather size={13} />,       color: 'text-pink-400' },
  { id: 'analyst',  label: 'Analyst',        desc: 'Evidence-based analysis', icon: <BarChart2 size={13} />,     color: 'text-green-400' },
  { id: 'tutor',    label: 'Tutor',          desc: 'Patient explainer',       icon: <GraduationCap size={13} />, color: 'text-yellow-400' },
]

const BUNDLED_SKILLS: SkillDef[] = [
  { id: 'debug',          label: 'Debug',         desc: 'Diagnose & fix errors',      icon: <Bug size={13} />,         color: 'text-red-400' },
  { id: 'simplify',       label: 'Simplify',      desc: 'Code review & cleanup',      icon: <Layers size={13} />,      color: 'text-cyan-400' },
  { id: 'verify',         label: 'Verify',        desc: 'Task completion check',      icon: <ShieldCheck size={13} />, color: 'text-emerald-400' },
  { id: 'verify-content', label: 'Verify Content',desc: 'Accuracy & fact check',      icon: <Target size={13} />,      color: 'text-orange-400' },
  { id: 'stuck',          label: 'Stuck',         desc: 'Recovery strategies',        icon: <Brain size={13} />,       color: 'text-purple-400' },
  { id: 'remember',       label: 'Remember',      desc: 'Persist key facts',          icon: <BookMarked size={13} />,  color: 'text-amber-400' },
  { id: 'batch',          label: 'Batch',         desc: 'Parallel orchestration',     icon: <Zap size={13} />,         color: 'text-yellow-300' },
  { id: 'loop',           label: 'Loop',          desc: 'Recurring task scheduler',   icon: <Repeat size={13} />,      color: 'text-sky-400' },
  { id: 'skillify',       label: 'Skillify',      desc: 'Convert to reusable skill',  icon: <Wand2 size={13} />,       color: 'text-violet-400' },
]

const AGENT_SKILLS: SkillDef[] = [
  { id: 'agent-general', label: 'General Agent',   desc: 'Research & multi-step tasks', icon: <Bot size={13} />,      color: 'text-teal-400' },
  { id: 'agent-explore', label: 'Explore Agent',   desc: 'Find files & symbols',        icon: <Search size={13} />,   color: 'text-blue-300' },
  { id: 'agent-plan',    label: 'Plan Agent',      desc: 'Architecture & strategy',     icon: <Map size={13} />,      color: 'text-indigo-400' },
  { id: 'agent-guide',   label: 'Claude Guide',    desc: 'Claude Code & API expert',    icon: <BookOpen size={13} />, color: 'text-orange-300' },
  { id: 'agent-verify',  label: 'Verify Agent',    desc: 'Build/test/lint checker',     icon: <ShieldCheck size={13} />, color: 'text-green-300' },
]

const ALL_SKILLS = [...CORE_SKILLS, ...BUNDLED_SKILLS, ...AGENT_SKILLS]

const STYLES: { id: Style; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'default',  label: 'Default',   desc: 'Balanced tone',          icon: <MessageSquare size={13} /> },
  { id: 'formal',   label: 'Formal',    desc: 'Professional & precise', icon: <Briefcase size={13} /> },
  { id: 'casual',   label: 'Casual',    desc: 'Friendly & relaxed',     icon: <MessageSquare size={13} /> },
  { id: 'concise',  label: 'Concise',   desc: 'Short & direct',         icon: <AlignLeft size={13} /> },
  { id: 'detailed', label: 'Detailed',  desc: 'Thorough & complete',    icon: <AlignJustify size={13} /> },
  { id: 'creative', label: 'Creative',  desc: 'Expressive & vivid',     icon: <Wand2 size={13} /> },
]

type MenuPage = 'main' | 'skills' | 'style'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void
  model: ModelId
  onModelChange: (m: ModelId) => void
  webSearch: boolean
  onWebSearchChange: (v: boolean) => void
  research: boolean
  onResearchChange: (v: boolean) => void
  skill: Skill
  onSkillChange: (s: Skill) => void
  style: Style
  onStyleChange: (s: Style) => void
  disabled?: boolean
  placeholder?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageInput({
  onSend, model, onModelChange,
  webSearch, onWebSearchChange,
  research, onResearchChange,
  skill, onSkillChange,
  style, onStyleChange,
  disabled, placeholder,
}: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPage, setMenuPage] = useState<MenuPage>('main')
  // URL fetch
  const [fetchMode, setFetchMode] = useState(false)
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetching, setFetching] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fetchInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  useEffect(() => {
    function click(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current && !plusBtnRef.current.contains(e.target as Node)
      ) { setMenuOpen(false); setMenuPage('main') }
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  useEffect(() => {
    if (fetchMode) setTimeout(() => fetchInputRef.current?.focus(), 50)
  }, [fetchMode])

  async function fileToAttachment(file: File): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const base64 = dataUrl.split(',')[1]
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64,
          preview: file.type.startsWith('image/') ? dataUrl : undefined,
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const allowed = arr.filter(f => {
      if (f.size > 5 * 1024 * 1024) { alert(`"${f.name}" exceeds 5 MB`); return false }
      return true
    })
    const atts = await Promise.all(allowed.map(fileToAttachment))
    setAttachments(prev => [...prev, ...atts])
  }

  async function takeScreenshot() {
    closeMenu()
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, preferCurrentTab: true })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), name: 'screenshot.png',
        type: 'image/png', size: base64.length, data: base64, preview: dataUrl,
      }])
    } catch { /* cancelled */ }
  }

  async function handleFetchUrl() {
    const url = fetchUrl.trim()
    if (!url) return
    setFetching(true)
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.error) { alert(`Fetch failed: ${data.error}`); return }
      if (data.text) {
        const bytes = new TextEncoder().encode(data.text)
        const base64 = btoa(String.fromCharCode(...bytes))
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          name: url.length > 60 ? url.slice(0, 60) + '…' : url,
          type: 'text/plain',
          size: data.text.length,
          data: base64,
          preview: undefined,
        }])
      }
    } catch (e: any) {
      alert(`Fetch failed: ${e.message}`)
    } finally {
      setFetching(false)
      setFetchMode(false)
      setFetchUrl('')
    }
  }

  function closeMenu() { setMenuOpen(false); setMenuPage('main') }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    if (disabled) return
    onSend(trimmed, attachments)
    setText(''); setAttachments([])
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled
  const activeSkillDef = ALL_SKILLS.find(s => s.id === skill)
  const hasActiveOptions = webSearch || research || skill !== 'general' || style !== 'default'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className={`relative rounded-2xl border transition-all ${
          dragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--surface)]'
        } shadow-sm`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map(att => (
              <div key={att.id} className="relative group/att">
                {att.preview ? (
                  <div className="relative">
                    <img src={att.preview} alt={att.name} className="h-16 w-16 rounded-lg object-cover border border-[var(--border)]" />
                    <button onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--text-secondary)] text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5 max-w-[200px]">
                    <span className="text-xs">{att.type === 'text/plain' ? '🌐' : '📄'}</span>
                    <span className="text-xs text-[var(--text-secondary)] truncate">{att.name}</span>
                    <button onClick={() => removeAttachment(att.id)} className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* URL fetch input */}
        {fetchMode && (
          <div className="flex items-center gap-2 px-4 pt-3">
            <Globe size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              ref={fetchInputRef}
              type="url"
              value={fetchUrl}
              onChange={e => setFetchUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFetchUrl()
                if (e.key === 'Escape') { setFetchMode(false); setFetchUrl('') }
              }}
              placeholder="Paste URL and press Enter…"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              disabled={fetching}
            />
            {fetching
              ? <Loader2 size={14} className="text-[var(--accent)] animate-spin flex-shrink-0" />
              : <button onClick={() => { setFetchMode(false); setFetchUrl('') }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex-shrink-0"><X size={14} /></button>
            }
          </div>
        )}

        {/* Active chips */}
        {hasActiveOptions && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
            {webSearch && (
              <button onClick={() => onWebSearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">
                <Globe size={10} />Web search<X size={9} className="ml-0.5" />
              </button>
            )}
            {research && (
              <button onClick={() => onResearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors">
                <FlaskConical size={10} />Research<X size={9} className="ml-0.5" />
              </button>
            )}
            {skill !== 'general' && activeSkillDef && (
              <button onClick={() => onSkillChange('general')}
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors">
                {activeSkillDef.icon}{activeSkillDef.label}<X size={9} className="ml-0.5" />
              </button>
            )}
            {style !== 'default' && (
              <button onClick={() => onStyleChange('default')}
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 transition-colors">
                <Paintbrush size={10} />{style}<X size={9} className="ml-0.5" />
              </button>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Message Claude…'}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
          style={{ maxHeight: '200px' }}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1 relative">

            {/* + button */}
            <button
              ref={plusBtnRef}
              type="button"
              onClick={() => { setMenuOpen(v => !v); setMenuPage('main') }}
              disabled={disabled}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                menuOpen ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Plus size={17} strokeWidth={2.2} />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div ref={menuRef}
                className="absolute bottom-full left-0 mb-2 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50 overflow-hidden">

                {/* MAIN PAGE */}
                {menuPage === 'main' && (
                  <div className="py-1">
                    <MI icon={<Image size={14} />} label="Add files or photos" onClick={() => { closeMenu(); fileInputRef.current?.click() }} />
                    <MI icon={<Camera size={14} />} label="Take a screenshot" onClick={takeScreenshot} />
                    <MI icon={<Link size={14} />} label="Fetch URL" onClick={() => { closeMenu(); setFetchMode(true) }} />
                    <div className="my-1 border-t border-[var(--border)]" />
                    <MI icon={<Zap size={14} />} label="Skills & Agents" chevron
                      onClick={() => setMenuPage('skills')}
                      badge={skill !== 'general' ? activeSkillDef?.label : undefined} />
                    <MI icon={<Paintbrush size={14} />} label="Use style" chevron
                      onClick={() => setMenuPage('style')}
                      badge={style !== 'default' ? style : undefined} />
                    <div className="my-1 border-t border-[var(--border)]" />
                    <MI icon={<Globe size={14} />} label="Web search" toggle checked={webSearch}
                      checkColor="text-blue-400"
                      onClick={() => { onWebSearchChange(!webSearch); closeMenu() }} />
                    <MI icon={<FlaskConical size={14} />} label="Research mode" toggle checked={research}
                      checkColor="text-purple-400"
                      onClick={() => { onResearchChange(!research); closeMenu() }} />
                  </div>
                )}

                {/* SKILLS PAGE */}
                {menuPage === 'skills' && (
                  <div className="flex flex-col" style={{ maxHeight: '420px' }}>
                    <button onClick={() => setMenuPage('main')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex-shrink-0">
                      <ChevronLeft size={13} />Back
                    </button>
                    <div className="border-t border-[var(--border)] flex-shrink-0" />
                    <div className="overflow-y-auto">
                      <SectionHeader label="Core" />
                      {CORE_SKILLS.map(s => <SkillRow key={s.id} def={s} active={skill === s.id} onSelect={() => { onSkillChange(s.id); closeMenu() }} />)}
                      <SectionHeader label="Bundled Skills" />
                      {BUNDLED_SKILLS.map(s => <SkillRow key={s.id} def={s} active={skill === s.id} onSelect={() => { onSkillChange(s.id); closeMenu() }} />)}
                      <SectionHeader label="Agent Modes" />
                      {AGENT_SKILLS.map(s => <SkillRow key={s.id} def={s} active={skill === s.id} onSelect={() => { onSkillChange(s.id); closeMenu() }} />)}
                    </div>
                  </div>
                )}

                {/* STYLE PAGE */}
                {menuPage === 'style' && (
                  <div className="py-1">
                    <button onClick={() => setMenuPage('main')}
                      className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
                      <ChevronLeft size={13} />Back
                    </button>
                    <div className="border-t border-[var(--border)] mb-1" />
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => { onStyleChange(s.id); closeMenu() }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-[var(--surface-hover)] transition-colors">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${style === s.id ? 'bg-teal-500/20 text-teal-400' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'}`}>{s.icon}</div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm text-[var(--text-primary)]">{s.label}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">{s.desc}</div>
                        </div>
                        {style === s.id && <Check size={13} className="text-teal-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css"
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)} />

            <ModelSelector value={model} onChange={onModelChange} disabled={disabled} />
          </div>

          <button type="button" onClick={handleSend} disabled={!canSend}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] active:scale-95">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-[var(--text-tertiary)]">
        Claude can make mistakes. Double-check important information.
      </p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MI({ icon, label, onClick, chevron, toggle, checked, checkColor, badge }: {
  icon: React.ReactNode; label: string; onClick: () => void
  chevron?: boolean; toggle?: boolean; checked?: boolean; checkColor?: string; badge?: string
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
        checked ? 'bg-blue-500/15 text-blue-400' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
      }`}>{icon}</div>
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-[10px] text-[var(--accent)] font-medium truncate max-w-[80px]">{badge}</span>}
      {chevron && <ChevronRight size={13} className="text-[var(--text-tertiary)] flex-shrink-0" />}
      {toggle && checked && <Check size={13} className={`${checkColor ?? 'text-[var(--accent)]'} flex-shrink-0`} />}
    </button>
  )
}

function SectionHeader({ label }: { label: string }) {
  return <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
}

function SkillRow({ def, active, onSelect }: { def: SkillDef; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-amber-500/15' : 'bg-[var(--surface-hover)]'} ${active ? 'text-amber-400' : def.color}`}>{def.icon}</div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm text-[var(--text-primary)]">{def.label}</div>
        <div className="text-[10px] text-[var(--text-tertiary)] truncate">{def.desc}</div>
      </div>
      {active && <Check size={12} className="text-amber-400 flex-shrink-0" />}
    </button>
  )
}
