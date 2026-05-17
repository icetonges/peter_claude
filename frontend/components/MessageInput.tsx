'use client'

import { useRef, useState, useEffect } from 'react'
import { Attachment, ModelId } from '@/lib/types'
import ModelSelector from './ModelSelector'
import { Paperclip, Send, X, ArrowUp } from 'lucide-react'

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void
  model: ModelId
  onModelChange: (m: ModelId) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({ onSend, model, onModelChange, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

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
    const maxSize = 5 * 1024 * 1024 // 5 MB
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

  // Drag & drop
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function handleDragLeave() { setDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled

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
          <div className="flex items-center gap-1">
            {/* File upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>
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
