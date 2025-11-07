export type AppConfig = {
  apiBase: string
  mlBase: string
}

const DEFAULTS: AppConfig = {
  apiBase: (import.meta as any).env.VITE_API_BASE || 'http://localhost:3001',
  mlBase: (import.meta as any).env.VITE_ML_BASE || 'http://localhost:8000',
}

const KEY = 'career-reco-config'

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

export function setConfig(next: Partial<AppConfig>) {
  const merged = { ...getConfig(), ...next }
  localStorage.setItem(KEY, JSON.stringify(merged))
  return merged
}

