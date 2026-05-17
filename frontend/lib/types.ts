// ModelId is now a plain string so new providers can be added freely
export type ModelId = string

export type Provider = 'anthropic' | 'google' | 'groq'

export interface ModelInfo {
  id: ModelId
  name: string
  provider: Provider
  providerLabel: string
  providerColor: string       // for badges
  inputPricePer1M: number     // USD — 0 for free models
  outputPricePer1M: number    // USD — 0 for free models
  description: string
  contextWindow: string       // e.g. "200K", "1M"
  isFree: boolean
  supportsVision: boolean
  isDefault?: boolean         // the app's default selection
  badge?: string              // e.g. "Recommended", "Fastest", "New"
}

// ─── MODEL REGISTRY ───────────────────────────────────────────────────────────

export const MODELS: ModelInfo[] = [

  // ── Google Gemini (free via Google AI Studio) ─────────────────────────────
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    providerLabel: 'Google',
    providerColor: '#4285f4',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    description: 'Best free model · 1M context · thinking mode',
    contextWindow: '1M',
    isFree: true,
    supportsVision: true,
    isDefault: true,
    badge: 'Recommended',
  },
  {
    id: 'gemini-2.5-f