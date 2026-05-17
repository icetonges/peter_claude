'use client'

import { useRef, useState, useEffect } from 'react'
import { Attachment, ModelId } from '@/lib/types'
import ModelSelector from './ModelSelector'
import { Plus, ArrowUp, X, Globe, FlaskConical, Image, Check } from 'lucide-react'

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void
  model: ModelId
  onModelChange: (m: ModelId) => void
  webSearch: boolean
  onWebSearchChange: (v: boolean) => void
  research: boolean
  onResearchChange: (v: boolean) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({
  onSend,
  model,
  onModelChange,
  webSearch,
  onWebSearchChange,
  research,
  onResearchChange,
  disabled,
  placeholder,
}: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current && !plusBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  function handleAddFiles() {
    setMenuOpen(false)
    fileInputRef.current?.click()
  }

  function toggleWebSearch() {
    onWebSearchChange(!webSearch)
    setMenuOpen(false)
  }

  function toggleResearch() {
    onResearchChange(!research)
    setMenuOpen(false)
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled
  const hasActiveOptions = webSearch || research

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className={`relative rounded-2xl border transition-all ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-[var(--border)] bg-[var(--surface)]'
        } shadow-sm`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map(att => (
              <div key={att.id} className="relative group/att">
                {att.preview ? (
                  <div className="relative">
                    <img src={att.preview} alt={att.name} className="h-16 w-16 rounded-lg object-cover border border-[var(--border)]" />
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--text-secondary)] text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5">
                    <span className="text-xs">📄</span>
                    <span className="text-xs text-[var(--text-secondary)] max-w-[100px] truncate">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
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
              <button
                onClick={() => onWebSearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition-colors"
              >
                <Globe size={11} />
                Web search
                <X size={10} className="ml-0.5 opacity-70" />
              </button>
            )}
            {research && (
              <button
                onClick={() => onResearchChange(false)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-purple-500/15 text-purple-500 hover:bg-purple-500/25 transition-colors"
              >
                <FlaskConical size={11} />
                Research
                <X size={10} className="ml-0.5 opacity-70" />
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
            {/* "+" button */}
            <button
              ref={plusBtnRef}
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              disabled={disabled}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                menuOpen
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
              title="Add tools"
            >
              <Plus size={17} strokeWidth={2.2} />
            </button>

            {/* Popup menu */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 z-50"
              >
                {/* Add files */}
                <button
                  onClick={handleAddFiles}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center flex-shrink-0">
                    <Image size={14} className="text-[var(--text-secondary)]" />
                  </div>
                  <span>Add files or photos</span>
                </button>

                <div className="my-1 border-t border-[var(--border)]" />

                {/* Web search toggle */}
                <button
                  onClick={toggleWebSearch}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    webSearch ? 'bg-blue-500/15' : 'bg-[var(--surface-hover)]'
                  }`}>
                    <Globe size={14} className={webSearch ? 'text-blue-500' : 'text-[var(--text-secondary)]'} />
                  </div>
                  <span className="flex-1 text-left">Web search</span>
                  {webSearch && <Check size={14} className="text-blue-500 flex-shrink-0" />}
                </button>

                {/* Research mode toggle */}
                <button
                  onClick={toggleResearch}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    research ? 'bg-purple-500/15' : 'bg-[var(--surface-hover)]'
                  }`}>
                    <FlaskConical size={14} className={research ? 'text-purple-500' : 'text-[var(--text-secondary)]'} />
                  </div>
                  <span className="flex-1 text-left">Research mode</span>
                  {research && <Check size={14} className="text-purple-500 flex-shrink-0" />}
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css"
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />

            {/* Model selector */}
            <ModelSelector value={model} onChange={onModelChange} disabled={disabled} />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] active:scale-95"
          >
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
