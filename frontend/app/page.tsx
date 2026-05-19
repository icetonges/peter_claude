'use client'

import { useState, useEffect } from 'react'
import { Conversation, ModelId } from '@/lib/types'
import {
  loadConversations,
  saveConversations,
  createConversation,
} from '@/lib/store'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-h-0">
        {/* Mobile-only top bar with hamburger */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)] md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">PeterClaude</span>
          <button
            onClick={handleNew}
            className="ml-auto p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="New chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <ChatView conversation={activeConversation} onUpdate={handleUpdate} onNew={handleNew} />
      </div>
    </div>
  )
}
