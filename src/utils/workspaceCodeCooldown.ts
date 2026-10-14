const WAIT_MS = 30000
const STORAGE_KEY = 'astro.workspace-code-cooldown'
const deadlines = new Map<string, number>()
const listeners = new Set<() => void>()

function readSavedDeadlines(): Record<string, number> {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved === 'object' && saved !== null && '_versao' in saved && saved._versao === 1
      && 'deadlines' in saved && typeof saved.deadlines === 'object' && saved.deadlines !== null) {
      return Object.fromEntries(Object.entries(saved.deadlines).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])))
    }
  } catch { /* Armazenamento indisponível: o limite continua em memória. */ }
  return {}
}

export function getWorkspaceCodeWait(email: string, now = Date.now()): number {
  const key = email.trim().toLowerCase()
  const deadline = Math.max(readSavedDeadlines()[key] ?? 0, deadlines.get(key) ?? 0)
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function reserveWorkspaceCodeRequest(email: string, now = Date.now()): boolean {
  const key = email.trim().toLowerCase()
  if (getWorkspaceCodeWait(key, now) > 0) return false
  for (const [savedEmail, deadline] of Object.entries(readSavedDeadlines())) {
    if (deadline > now) deadlines.set(savedEmail, Math.max(deadline, deadlines.get(savedEmail) ?? 0))
  }
  for (const [savedEmail, deadline] of deadlines) if (deadline <= now) deadlines.delete(savedEmail)
  deadlines.set(key, now + WAIT_MS)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ _versao: 1, deadlines: Object.fromEntries(deadlines) }))
  } catch { /* O limite em memória também cobre a troca entre telas. */ }
  listeners.forEach(listener => listener())
  return true
}

export function subscribeWorkspaceCodeWait(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
