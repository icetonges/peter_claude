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
    if (stored.length > 0) {
      setActiveId(stored.sort((a, b) => b.updatedAt - a.updatedAt)[0].id)
    }
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

  // Auto-create first conversation
  function handleFirstMessage() {
    if (!activeId) {
      handleNew()
    }
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
      />

      {activeConversation ? (
        <ChatView conversation={activeConversation} onUpdate={handleUpdate} />
      ) : (
        /* No conversation selected */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg)]">
          <p className="text-[var(--text-secondary)] text-sm">Select a conversation or start a new one.</p>
          <button
            onClick={handleNew}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            New conversation
          </button>
        </div>
      )}
    </div>
  )
}
