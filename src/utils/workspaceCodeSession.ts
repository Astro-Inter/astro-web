import { validateManagerEmail } from './workspaceRegistration'

const STORAGE_KEY = 'astro.workspace-code-session'

export function readWorkspaceCodeEmail(): string {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved === 'object' && saved !== null && '_versao' in saved && saved._versao === 1
      && 'email' in saved && typeof saved.email === 'string' && !validateManagerEmail(saved.email)) return saved.email
  } catch { /* O cadastro pode começar novamente se não houver armazenamento. */ }
  return ''
}

export function saveWorkspaceCodeEmail(email: string): void {
  try {
    if (validateManagerEmail(email)) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ _versao: 1, email: email.trim().toLowerCase() }))
  } catch { /* O rascunho em memória continua disponível. */ }
}
