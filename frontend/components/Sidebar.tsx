'use client'

import { Conversation } from '@/lib/types'
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Zap, Layers } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { calcCost, formatCost } from '@/lib/store'
import { MODELS } from '@/lib/types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
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

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const groups = groupByDate(conversations)

  // Total cost across all conversations
  const totalCost = conversations.reduce((sum, conv) => {
    const model = MODELS.find(m => m.id === conv.model) ?? MODELS[1]
    return sum + calcCost(conv.totalUsage, model.inputPricePer1M, model.outputPricePer1M)
  }, 0)

  return (
    <aside
      className={`flex flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        {!collapsed && (
          <span className="text-sm font-semibold text-[var(--text-primary)]">PeterClaude</span>
        )}
        <div className={`flex items-center gap-1 ${collapsed ? 'w-full justify-center' : ''}`}>
          {!collapsed && (
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              title="New conversation"
            >
              <Plus size={14} />
              New chat
            </button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {collapsed ? (
        /* Collapsed: just show new chat button */
        <div className="flex flex-col items-center gap-2 pt-3">
          <button
            onClick={onNew}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="New conversation"
          >
            <Plus size={16} />
          </button>
        </div>
      ) : (
        <>
          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto py-2">
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                <MessageSquare size={24} className="text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-tertiary)]">No conversations yet. Start chatting!</p>
              </div>
            )}

            {groups.map(group => (
              <div key={group.label} className="mb-2">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {group.label}
                </p>
                {group.items.map(conv => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`group/item relative flex items-center mx-1 rounded-lg cursor-pointer transition-colors ${
                      conv.id === activeId
                        ? 'bg-[var(--surface-hover)]'
                        : 'hover:bg-[var(--surface-hover)]'
                    }`}
                    onClick={() => onSelect(conv.id)}
                  >
                    <div className="flex-1 min-w-0 px-3 py-2">
                      <p className="truncate text-sm text-[var(--text-primary)]">{conv.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {MODELS.find(m => m.id === conv.model)?.name ?? conv.model}
                      </p>
                    </div>

                    {hoveredId === conv.id && (
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
                        className="flex-shrink-0 pr-2 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-1.5">
            {conversations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <Zap size={11} className="text-[var(--accent-muted)]" />
                <span>Total cost: <span className="text-[var(--text-secondary)]">{formatCost(totalCost)}</span></span>
              </div>
            )}
            <Link
              href="/architecture"
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Layers size={11} />
              <span>Architecture</span>
            </Link>
          </div>
        </>
      )}
    </aside>
  )
}
