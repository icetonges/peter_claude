'use client'

import { useState, useEffect } from 'react'
import { Conversation, ModelId } from '@/lib/types'
import {
  loadConversations,
  saveConversations,
  createConversation,
} from '@/lib/store'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadConversations()
    setConversations(stored)
    // Always open new chat screen on load
    setHydrated(true)
  }, [])

  // Persist on every change
  useEffect(() => {
    if (hydrated) saveConversations(conversations)
  }, [conversations, hydrated])

  function handleNew() {
    const conv = createConversation()
    setConversations(prev => [conv, ...prev])
    setActiveId(conv.id)
  }

  function handleNewWithSkill(skill: string) {
    handleNew()
    // skill routing handled by ChatView default props
  }

  function handleSelect(id: string) {
    setActiveId(id)
  }

  function handleDelete(id: string) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null)
      }
      return next
    })
  }

  function handleUpdate(updated: Conversation) {
    setConversations(prev =>
      prev.map(c => (c.id === updated.id ? updated : c))
    )
  }


  const activeConversation = conversations.find(c => c.id === activeId) ?? null

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--text-tertiary)]">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onNewWithSkill={handleNewWithSkill}
      />

      {activeConversation ? (
        <ChatView conversation={activeConversation} onUpdate={handleUpdate} />
      ) : (
        /* New chat welcome screen */
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 bg-[var(--bg)]">
          <div className="flex items-center gap-4">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(26,26)">
                <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(0)"/>
                <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(45)"/>
                <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(90)"/>
                <rect x="-5.5" y="-18" width="11" height="36" rx="5.5" fill="#da7756" transform="rotate(135)"/>
              </g>
            </svg>
            <h1 className="text-5xl font-normal tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              How can I help you?
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Write', 'Learn', 'Code', 'Life stuff'].map(label => (
              <button key={label} onClick={handleNew}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
