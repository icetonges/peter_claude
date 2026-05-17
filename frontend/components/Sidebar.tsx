'use client'

import { Conversation } from '@/lib/types'
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Zap, Layers,
         Search, FolderOpen, Code2, Settings, Palette, Moon, Sun, Monitor,
         Star, X, ExternalLink, PenSquare } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { calcCost, formatCost } from '@/lib/store'
import { MODELS } from '@/lib/types'

type NavSection = 'chats' | 'search' | 'projects' | 'artifacts' | 'customize'
type ThemeMode = 'system' | 'light' | 'dark'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onNewWithSkill?: (skill: string) => void
}

function groupByDate(convs: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const week = new Date(today)
  week.setDate(week.getDate() - 7)
  const todayItems: Conversation[] = []
  const yesterdayItems: Conversation[] = []
  const weekItems: Conversation[] = []
  const olderItems: Conversation[] = []
  for (const c of [...convs].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const d = new Date(c.updatedAt)
    d.setHours(0, 0, 0, 0)
    if (d >= today) todayItems.push(c)
    else if (d >= yesterday) yesterdayItems.push(c)
    else if (d >= week) weekItems.push(c)
    else olderItems.push(c)
  }
  if (todayItems.length) groups.push({ label: 'Today', items: todayItems })
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems })
  if (weekItems.length) groups.push({ label: 'Previous 7 days', items: weekItems })
  if (olderItems.length) groups.push({ label: 'Older', items: olderItems })
  return groups
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onNewWithSkill }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [navSection, setNavSection] = useState<NavSection>('chats')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [starredIds, setStarredIds] = useState<string[]>([])
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as ThemeMode | null
      if (saved) setThemeMode(saved)
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (navSection === 'search') {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [navSection])

  function applyTheme(mode: ThemeMode) {
    try {
      const root = document.documentElement
      if (mode === 'dark') root.setAttribute('data-theme', 'dark')
      else if (mode === 'light') root.setAttribute('data-theme', 'light')
      else root.removeAttribute('data-theme')
      localStorage.setItem('theme', mode)
    } catch (e) {}
  }

  function handleTheme(mode: ThemeMode) {
    setThemeMode(mode)
    applyTheme(mode)
  }

  function toggleStar(id: string) {
    setStarredIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filtered = searchQuery.trim()
    ? conversations.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : conversations

  const groups = groupByDate(filtered)

  const totalCost = conversations.reduce((sum, conv) => {
    const model = MODELS.find(m => m.id === conv.model) ?? MODELS[1]
    return sum + calcCost(conv.totalUsage, model.inputPricePer1M, model.outputPricePer1M)
  }, 0)

  // Extract code artifacts from conversations
  const artifacts: { id: string; lang: string; snippet: string; convId: string; convTitle: string }[] = []
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.role !== 'assistant') continue
      const re = /```(\w+)?\n([\s\S]{10,200}?)```/g
      let m = re.exec(msg.content)
      while (m && artifacts.length < 15) {
        artifacts.push({ id: conv.id + artifacts.length, lang: m[1] || 'code', snippet: m[2].trim().slice(0, 80), convId: conv.id, convTitle: conv.title })
        m = re.exec(msg.content)
      }
    }
  }

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center border-r border-[var(--border)] bg-[var(--sidebar-bg)] w-12 py-2 gap-1">
        <button onClick={onNew} title="New chat" className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors"><Plus size={18} /></button>
        <div className="w-6 border-t border-[var(--border)] my-1" />
        {([['search', Search], ['chats', MessageSquare], ['projects', FolderOpen], ['artifacts', Layers]] as [NavSection, any][]).map(([id, Icon]) => (
          <button key={id} onClick={() => { setNavSection(id); setCollapsed(false) }} title={id}
            className={`p-2 rounded-lg transition-colors ${navSection === id ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]'}`}>
            <Icon size={15} />
          </button>
        ))}
        <div className="w-6 border-t border-[var(--border)] my-1" />
        <button onClick={() => { onNewWithSkill?.('code'); onNew() }} title="Code" className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><Code2 size={15} /></button>
        <button onClick={() => { setNavSection('customize'); setCollapsed(false) }} title="Customize" className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><Settings size={15} /></button>
        <button onClick={() => { onNewWithSkill?.('creative'); onNew() }} title="Design" className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><Palette size={15} /></button>
        <div className="flex-1" />
        <button onClick={() => setCollapsed(false)} title="Expand" className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><ChevronRight size={14} /></button>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] w-64">

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-sm font-semibold text-[var(--text-primary)]">PeterClaude</span>
        <div className="flex items-center gap-1">
          <button onClick={onNew} title="New chat" className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"><PenSquare size={14} /></button>
          <button onClick={() => setCollapsed(true)} title="Collapse" className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"><ChevronLeft size={14} /></button>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-2 py-2">
        <button onClick={onNew} className="w-full flex items-center gap-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-2 text-sm font-medium transition-colors">
          <Plus size={15} />New chat
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-2 space-y-0.5">
        {([['search', Search, 'Search'], ['chats', MessageSquare, 'Chats'], ['projects', FolderOpen, 'Projects'], ['artifacts', Layers, 'Artifacts']] as [NavSection, any, string][]).map(([id, Icon, label]) => (
          <button key={id} onClick={() => setNavSection(id)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${navSection === id ? 'bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
            <Icon size={15} />{label}
            {id === 'chats' && conversations.length > 0 && <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{conversations.length}</span>}
          </button>
        ))}
      </nav>

      <div className="mx-3 my-2 border-t border-[var(--border)]" />

      {/* Quick modes */}
      <nav className="px-2 space-y-0.5">
        <button onClick={() => { onNewWithSkill?.('code'); onNew() }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
          <Code2 size={15} />Code
        </button>
        <button onClick={() => setNavSection('customize')}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${navSection === 'customize' ? 'bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
          <Settings size={15} />Customize
        </button>
        <button onClick={() => { onNewWithSkill?.('creative'); onNew() }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
          <Palette size={15} />Design
        </button>
        <Link href="/architecture"
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
          <ExternalLink size={15} />Architecture
        </Link>
      </nav>

      {/* Dynamic section content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-2">

        {navSection === 'search' && (
          <div className="flex flex-col flex-1 min-h-0 px-2">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 mb-2">
              <Search size={13} className="text-[var(--text-tertiary)] shrink-0" />
              <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X size={12} /></button>}
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchQuery && filtered.length === 0 && <p className="text-xs text-[var(--text-tertiary)] text-center py-8">No results</p>}
              {groups.map(g => (
                <div key={g.label} className="mb-2">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{g.label}</p>
                  {g.items.map(conv => <ConvRow key={conv.id} conv={conv} activeId={activeId} hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect} onDelete={onDelete} starred={starredIds.includes(conv.id)} onStar={() => toggleStar(conv.id)} />)}
                </div>
              ))}
            </div>
          </div>
        )}

        {navSection === 'chats' && (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                <MessageSquare size={24} className="text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-tertiary)]">No conversations yet. Start chatting!</p>
              </div>
            )}
            {groups.map(g => (
              <div key={g.label} className="mb-2">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{g.label}</p>
                {g.items.map(conv => <ConvRow key={conv.id} conv={conv} activeId={activeId} hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect} onDelete={onDelete} starred={starredIds.includes(conv.id)} onStar={() => toggleStar(conv.id)} />)}
              </div>
            ))}
          </div>
        )}

        {navSection === 'projects' && (
          <div className="flex-1 overflow-y-auto px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] py-1 mb-2">Starred</p>
            {starredIds.length > 0
              ? conversations.filter(c => starredIds.includes(c.id)).map(conv =>
                  <ConvRow key={conv.id} conv={conv} activeId={activeId} hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect} onDelete={onDelete} starred={true} onStar={() => toggleStar(conv.id)} />
                )
              : <p className="text-xs text-[var(--text-tertiary)] text-center py-8">Star conversations to pin them here.</p>
            }
          </div>
        )}

        {navSection === 'artifacts' && (
          <div className="flex-1 overflow-y-auto px-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] py-1 mb-1">Generated code</p>
            {artifacts.length === 0
              ? <p className="text-xs text-[var(--text-tertiary)] text-center py-8">Code from your chats will appear here.</p>
              : artifacts.map(a => (
                  <button key={a.id} onClick={() => onSelect(a.convId)}
                    className="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] px-3 py-2 mb-1.5 transition-colors">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase">{a.lang}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate">{a.convTitle}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate font-mono">{a.snippet}</p>
                  </button>
                ))
            }
          </div>
        )}

        {navSection === 'customize' && (
          <div className="flex-1 overflow-y-auto px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] py-1 mb-3">Customize</p>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Theme</p>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {(['system', 'light', 'dark'] as ThemeMode[]).map(mode => (
                <button key={mode} onClick={() => handleTheme(mode)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs capitalize transition-colors ${themeMode === mode ? 'border-[var(--accent)] text-[var(--accent)] font-medium bg-[var(--surface)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                  {mode === 'system' ? <Monitor size={13} /> : mode === 'light' ? <Sun size={13} /> : <Moon size={13} />}
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Stats</p>
            <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 space-y-1.5 mb-4">
              <div className="flex justify-between text-xs"><span className="text-[var(--text-tertiary)]">Conversations</span><span className="text-[var(--text-secondary)]">{conversations.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[var(--text-tertiary)]">Total cost</span><span className="text-[var(--accent)]">{formatCost(totalCost)}</span></div>
            </div>
            <Link href="/architecture" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
              Architecture diagram<ExternalLink size={11} className="text-[var(--text-tertiary)]" />
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      {navSection === 'chats' && conversations.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Zap size={11} className="text-[var(--accent-muted)]" />
            <span>Cost: <span className="text-[var(--text-secondary)]">{formatCost(totalCost)}</span></span>
          </div>
        </div>
      )}
    </aside>
  )
}

function ConvRow({ conv, activeId, hoveredId, setHoveredId, onSelect, onDelete, starred, onStar }: {
  conv: Conversation; activeId: string | null; hoveredId: string | null
  setHoveredId: (id: string | null) => void; onSelect: (id: string) => void
  onDelete: (id: string) => void; starred: boolean; onStar: () => void
}) {
  return (
    <div onMouseEnter={() => setHoveredId(conv.id)} onMouseLeave={() => setHoveredId(null)}
      onClick={() => onSelect(conv.id)}
      className={`group/item relative flex items-center mx-1 rounded-lg cursor-pointer transition-colors ${conv.id === activeId ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]'}`}>
      <div className="flex-1 min-w-0 px-3 py-2">
        <p className="truncate text-sm text-[var(--text-primary)]">{conv.title}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{MODELS.find(m => m.id === conv.model)?.name ?? conv.model}</p>
      </div>
      {hoveredId === conv.id && (
        <div className="flex items-center gap-0.5 pr-2 shrink-0">
          <button onClick={e => { e.stopPropagation(); onStar() }}
            className={`p-1 rounded transition-colors ${starred ? 'text-yellow-500' : 'text-[var(--text-tertiary)] hover:text-yellow-500'}`}>
            <Star size={12} fill={starred ? 'currentColor' : 'none'} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
            className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
