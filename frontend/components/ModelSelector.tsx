'use client'

import { MODELS, ModelId } from '@/lib/types'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Props {
  value: ModelId
  onChange: (model: ModelId) => void
  disabled?: boolean
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = MODELS.find(m => m.id === value) ?? MODELS[1]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{selected.name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50">
          <div className="p-1.5">
            {MODELS.map(model => (
              <button
                key={model.id}
                type="button"
                onClick={() => { onChange(model.id); setOpen(false) }}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] ${
                  model.id === value ? 'bg-[var(--surface-hover)]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{model.name}</span>
                  {model.id === value && (
                    <span className="text-xs text-[var(--accent)]">Selected</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{model.description}</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  ${model.inputPricePer1M}/M in · ${model.outputPricePer1M}/M out
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
