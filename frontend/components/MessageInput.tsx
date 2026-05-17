'use client'

import { useRef, useState, useEffect } from 'react'
import { Attachment, ModelId } from '@/lib/types'
import ModelSelector from './ModelSelector'
import {
  Plus, ArrowUp, X, Globe, FlaskConical, Image, Check,
  Camera, ChevronRight, ChevronLeft, Zap, Paintbrush,
  Code2, Feather, BarChart2, GraduationCap, Sparkles,
  AlignLeft, AlignJustify, MessageSquare, Briefcase, Wand2,
} from 'lucide-react'

export type Skill = 'general' | 'code' | 'creative' | 'analyst' | 'tutor'
export type Style = 'default' | 'formal' | 'casual' | 'concise' | 'detailed' | 'creative'

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

const SKILLS: { id: Skill; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'general',  label: 'General assistant', desc: 'Helpful & balanced',   icon: <Sparkles size={14} /> },
  { id: 'code',     label: 'Code assistant',    desc: 'Expert programmer',    icon: <Code2 size={14} /> },
  { id: 'creative', label: 'Creative writer',   desc: 'Vivid storytelling',   icon: <Feather size={14} /> },
  { id: 'analyst',  label: 'Data analyst',      desc: 'Evidence-based',       icon: <BarChart2 size={14} /> },
  { id: 'tutor',    label: 'Study tutor',       desc: 'Patient explainer',    icon: <GraduationCap size={14} /> },
]

const STYLES: { id: Style; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'default',  label: 'Default',   desc: 'Balanced tone',          icon: <MessageSquare size={14} /> },
  { id: 'formal',   label: 'Formal',    desc: 'Professional & precise', icon: <Briefcase size={14} /> },
  { id: 'casual',   label: 'Casual',    desc: 'Friendly & relaxed',     icon: <MessageSquare size={14} /> },
  { id: 'concise',  label: 'Concise',   desc: 'Short & to the point',   icon: <AlignLeft size={14} /> },
  { id: 'detailed', label: 'Detailed',  desc: 'Thorough & complete',     icon: <AlignJustify size={14} /> },
  { id: 'creative', label: 'Creative',  desc: 'Expressive & vivid',     icon: <Wand2 size={14} /> },
]

type MenuPage = 'main' | 'skills' | 'style'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current && !plusBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
        setMenuPage('main')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
    const maxSize = 5 * 1024 * 1024
    const allowed = arr.filter(f => {
      if (f.size > maxSize) { alert(`"${f.name}" is too large (max 5 MB).`); return false }
      return true
    })
    const atts = await Promise.all(allowed.map(fileToAttachment))
    setAttachments(prev => [...prev, ...atts])
  }

  async function takeScreenshot() {
    closeMenu()
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        preferCurrentTab: true,
      })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(),
        name: 'screenshot.png',
        type: 'image/png',
        size: base64.length,
        data: base64,
        preview: dataUrl,
      }])
    } catch { /* user cancelled */ }
  }

  function closeMenu() {
    setMenuOpen(false)
    setMenuPage('main')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    if (disabled) return
    onSend(trimmed, attachments)
    setText('')
    setAttachments([])
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function handleDragLeave() { setDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled
  const activeSkill = SKILLS.find(s => s.id === skill)
  const activeStyle = STYLES.find(s => s.id === style)
  const hasActiveOptions = webSearch || research || skill !== 'general' || style !== 'default'

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className={`relative rounded-2xl border transition-all ${
          dragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--surface)]'
        } shadow-sm`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5">
                    <span className="text-xs">📄</span>
                    <span className="text-xs text-[var(--text-secondary)] max-w-[100px] truncate">{att.name}</span>
                    <button onClick={() => removeAttachment(att.id)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active option chips */}
        {hasActiveOptions && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
            {webSearch && (
              <button onClick={() => onWebSearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-colors">
                <Globe size={11} />Web search<X size={10} className="ml-0.5 opacity-70" />
              </button>
            )}
            {research && (
              <button onClick={() => onResearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-purple-500/15 text-purple-500 hover:bg-purple-500/25 transition-colors">
                <FlaskConical size={11} />Research<X size={10} className="ml-0.5 opacity-70" />
              </button>
            )}
            {skill !== 'general' && activeSkill && (
              <button onClick={() => onSkillChange('general')}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors">
                <Zap size={11} />{activeSkill.label}<X size={10} className="ml-0.5 opacity-70" />
              </button>
            )}
            {style !== 'default' && activeStyle && (
              <button onClick={() => onStyleChange('default')}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-500/15 text-teal-500 hover:bg-teal-500/25 transition-colors">
                <Paintbrush size={11} />{activeStyle.label}<X size={10} className="ml-0.5 opacity-70" />
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
              title="More options"
            >
              <Plus size={17} strokeWidth={2.2} />
            </button>

            {/* Popup menu */}
            {menuOpen && (
              <div ref={menuRef}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 z-50 overflow-hidden">

                {/* Main page */}
                {menuPage === 'main' && (
                  <>
                    <MenuItem icon={<Image size={14} />} label="Add files or photos"
                      onClick={() => { closeMenu(); fileInputRef.current?.click() }} />
                    <MenuItem icon={<Camera size={14} />} label="Take a screenshot"
                      onClick={takeScreenshot} />

                    <div className="my-1 border-t border-[var(--border)]" />

                    <MenuItem icon={<Zap size={14} />} label="Skills"
                      chevron onClick={() => setMenuPage('skills')}
                      active={skill !== 'general'}
                      activeDot />
                    <MenuItem icon={<Paintbrush size={14} />} label="Use style"
                      chevron onClick={() => setMenuPage('style')}
                      active={style !== 'default'}
                      activeDot />

                    <div className="my-1 border-t border-[var(--border)]" />

                    <MenuItem icon={<Globe size={14} />} label="Web search"
                      onClick={() => { onWebSearchChange(!webSearch); closeMenu() }}
                      checked={webSearch} checkColor="text-blue-500" />
                    <MenuItem icon={<FlaskConical size={14} />} label="Research mode"
                      onClick={() => { onResearchChange(!research); closeMenu() }}
                      checked={research} checkColor="text-purple-500" />
                  </>
                )}

                {/* Skills submenu */}
                {menuPage === 'skills' && (
                  <>
                    <button onClick={() => setMenuPage('main')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors font-medium">
                      <ChevronLeft size={13} />Back
                    </button>
                    <div className="my-1 border-t border-[var(--border)]" />
                    {SKILLS.map(s => (
                      <button key={s.id}
                        onClick={() => { onSkillChange(s.id); closeMenu() }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          skill === s.id ? 'bg-amber-500/15 text-amber-500' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                        }`}>{s.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--text-primary)]">{s.label}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">{s.desc}</div>
                        </div>
                        {skill === s.id && <Check size={13} className="text-amber-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                {/* Style submenu */}
                {menuPage === 'style' && (
                  <>
                    <button onClick={() => setMenuPage('main')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors font-medium">
                      <ChevronLeft size={13} />Back
                    </button>
                    <div className="my-1 border-t border-[var(--border)]" />
                    {STYLES.map(s => (
                      <button key={s.id}
                        onClick={() => { onStyleChange(s.id); closeMenu() }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          style === s.id ? 'bg-teal-500/15 text-teal-500' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                        }`}>{s.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--text-primary)]">{s.label}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">{s.desc}</div>
                        </div>
                        {style === s.id && <Check size={13} className="text-teal-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css"
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)} />

            {/* Model selector */}
            <ModelSelector value={model} onChange={onModelChange} disabled={disabled} />
          </div>

          {/* Send button */}
          <button type="button" onClick={handleSend} disabled={!canSend}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] active:scale-95">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-[var(--text-tertiary)]">
        Claude can make mistakes. Please double-check important information.
      </p>
    </div>
  )
}

// --- Menu item helper ---
function MenuItem({
  icon, label, onClick, chevron, checked, checkColor, active, activeDot,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  chevron?: boolean
  checked?: boolean
  checkColor?: string
  active?: boolean
  activeDot?: boolean
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 relative ${
        checked ? 'bg-blue-500/15' : active ? 'bg-amber-500/10' : 'bg-[var(--surface-hover)]'
      } ${checked ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>
        {icon}
        {activeDot && active && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border border-[var(--surface)]" />
        )}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {chevron && <ChevronRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />}
      {checked && <Check size={14} className={`${checkColor ?? 'text-[var(--accent)]'} flex-shrink-0`} />}
    </button>
  )
}
