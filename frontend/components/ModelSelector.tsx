'use client'

import { MODELS, ModelId, Provider } from '@/lib/types'
import { ChevronDown, Check, Eye, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Props {
  value: ModelId
  onChange: (model: ModelId) => void
  disabled?: boolean
}

const PROVIDER_ORDER: Provider[] = ['google', 'groq', 'anthropic']

const PROVIDER_LABELS: Record<Provider, string> = {
  google: '✦ Google — Free',
  groq: '⚡ Groq — Free',
  anthropic: '◆ Anthropic — Paid',
}

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Recommended: { bg: '#10b981', text: '#fff' },
  Fastest:     { bg: '#f59e0b', text: '#fff' },
  Fast:        { bg: '#3b82f6', text: '#fff' },
  Balanced:    { bg: '#8b5cf6', text: '#fff' },
  New:         { bg: '#ec4899', text: '#fff' },
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = MODELS.find(m => m.id === value) ?? MODELS[0]

  // Group models by provider in order
  const groups = PROVIDER_ORDER.map(provider => ({
    provider,
    label: PROVIDER_LABELS[provider],
    models: MODELS.filter(m => m.provider === provider),
  })).filter(g => g.models.length > 0)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[200px]"
      >
        {/* Provider color dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.providerColor }} />

        <span className="truncate">{selected.name}</span>

        {/* FREE pill */}
        {selected.isFree && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-600 dark:text-green-400 leading-none flex-shrink-0">
            FREE
          </span>
        )}

        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-hover)]">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Select model</p>
          </div>

          <div className="max-h-[460px] overflow-y-auto py-1.5">
            {groups.map(({ provider, label, models }) => (
              <div key={provider}>
                {/* Group header */}
                <div className="px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: models[0].providerColor }} />
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
                  {provider !== 'anthropic' && (
                    <span className="ml-auto rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:text-green-400">FREE</span>
                  )}
                </div>

                {/* Models in group */}
                {models.map(model => {
                  const isSelected = model.id === value
                  const badge = model.badge ? BADGE_COLORS[model.badge] : null

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { onChange(model.id); setOpen(false) }}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] ${isSelected ? 'bg-[var(--surface-hover)]' : ''}`}
                    >
                      {/* Selection indicator */}
                      <div className="mt-1 w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: isSelected ? model.providerColor : 'var(--border)',
                          backgroundColor: isSelected ? model.providerColor : 'transparent',
                        }}>
                        {isSelected && <Check size={8} color="white" strokeWidth={3} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{model.name}</span>
                          {badge && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none"
                              style={{ backgroundColor: badge.bg, color: badge.text }}>
                              {model.badge}
                            </span>
                          )}
                          {model.supportsVision && (
                            <Eye size={10} className="text-[var(--text-tertiary)]" title="Supports image uploads" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{model.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{model.contextWindow} ctx</span>
                          {model.isFree ? (
                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Free tier</span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              ${model.inputPricePer1M}/M in · ${model.outputPricePer1M}/M out
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {/* API key hint for paid Anthropic */}
                {provider === 'anthropic' && (
                  <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <AlertCircle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                      Requires <code className="font-mono">ANTHROPIC_API_KEY</code> in Vercel env vars
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] px-4 py-2 bg-[var(--surface-hover)]">
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Free models require API keys from{' '}
              <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-secondary)]">Google AI Studio</a>
              {' '}and{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-secondary)]">Groq Console</a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
