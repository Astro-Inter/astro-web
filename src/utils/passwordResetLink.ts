export interface PasswordResetLink { code: string; invalid: boolean; active: boolean }

export function capturePasswordResetLink(browser: Pick<Window, 'location' | 'history'>): PasswordResetLink {
  const url = new URL(browser.location.href)
  const active = /\/replacePassword\/?$/.test(url.pathname)
  if (!active) return { code: '', invalid: false, active: false }
  const codes = url.searchParams.getAll('oobCode')
  const modes = url.searchParams.getAll('mode')
  const code = codes[0] ?? ''
  const invalid = codes.length !== 1 || modes.length !== 1 || modes[0] !== 'resetPassword' || !code || code.length > 2048 || /\s/.test(code)
  // Código apenas em memória; remove também continueUrl e apiKey antes do tracking.
  browser.history.replaceState(browser.history.state, '', url.pathname)
  return { code: invalid ? '' : code, invalid, active }
}

export const passwordResetLink = typeof window === 'undefined'
  ? { code: '', invalid: true, active: false }
  : capturePasswordResetLink(window)
