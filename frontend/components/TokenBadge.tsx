'use client'

import { TokenUsage, ModelId, MODELS } from '@/lib/types'
import { calcCost, formatCost } from '@/lib/store'
import { Zap } from 'lucide-react'

interface Props {
  usage: TokenUsage
  model: ModelId
  cumulative?: boolean
}

export default function TokenBadge({ usage, model, cumulative }: Props) {
  const modelInfo = MODELS.find(m => m.id === model) ?? MODELS[1]
  const cost = calcCost(usage, modelInfo.inputPricePer1M, modelInfo.outputPricePer1M)
  const totalTokens = usage.inputTokens + usage.outputTokens

  return (
    <div
      title={`Input: ${usage.inputTokens.toLocaleString()} tokens\nOutput: ${usage.outputTokens.toLocaleString()} tokens\nCost: ${formatCost(cost)}`}
      className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)] cursor-default select-none"
    >
      <Zap size={10} className="text-[var(--accent-muted)]" />
      <span>{totalTokens.toLocaleString()} tokens</span>
      <span className="text-[var(--border)]">·</span>
      <span>{formatCost(cost)}</span>
      {cumulative && <span className="ml-0.5 text-[var(--text-tertiary)] opacity-60">total</span>}
    </div>
  )
}
