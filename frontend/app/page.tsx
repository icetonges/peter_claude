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

      <ChatView conversation={activeConversation} onUpdate={handleUpdate} onNew={handleNew} />
    </div>
  )
}
