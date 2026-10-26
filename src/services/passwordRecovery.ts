import type { PasswordRecoveryValues, RecoveryChallenge } from '../types/passwordRecovery'
import { validateRecoveryEmail, validatePasswordReplacement } from '../utils/passwordRecovery'

const baseUrl = import.meta.env.VITE_PASSWORD_RESET_API_URL?.trim().replace(/\/+$/, '')
let challenge: RecoveryChallenge | null = null
let retryAt = 0

export function getPasswordRecoveryRetrySeconds(): number {
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
}

export class PasswordRecoveryError extends Error {
  readonly field: keyof PasswordRecoveryValues | 'form'
  constructor(field: keyof PasswordRecoveryValues | 'form', message: string) { super(message); this.field = field }
}

export function getRecoveryChallenge(): RecoveryChallenge | null { return challenge ? { ...challenge } : null }

async function post(endpoint: string, payload: object, signal: AbortSignal): Promise<string> {
  if (!baseUrl) throw new PasswordRecoveryError('form', 'A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.')
  if (getPasswordRecoveryRetrySeconds()) throw new PasswordRecoveryError('form', 'Muitas solicitações. Aguarde para tentar novamente.')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.throwIfAborted()
  signal.addEventListener('abort', abort, { once: true })
  // O Worker pode usar até 60s para OAuth, Firebase e aceitação SMTP.
  const timer = setTimeout(abort, 70000)
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('invalid URL')
    const requestBase = import.meta.env.DEV ? '/password-reset-api' : baseUrl
    const response = await fetch(requestBase + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    // O limite é compartilhado entre os dois endpoints, inclusive com erro sem JSON.
    if (response.status === 429) {
      const header = response.headers.get('Retry-After')?.trim()
      const seconds = header && /^\d+$/.test(header) ? Number(header) : NaN
      const date = header ? Date.parse(header) : NaN
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? date - Date.now() : 60000
      retryAt = Date.now() + Math.max(1000, delay)
      throw new PasswordRecoveryError('form', 'Muitas solicitações. Aguarde para tentar novamente.')
    }
    if (response.status >= 500) throw new PasswordRecoveryError('form', 'O serviço de recuperação está temporariamente indisponível. Tente novamente.')
    const body: unknown = await response.json()
    if (response.status === 200 && body && typeof body === 'object' && 'success' in body && body.success === true) {
      return 'message' in body && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : 'Se o e-mail informado estiver cadastrado, você receberá instruções para redefinir sua senha. Confira também a pasta de spam.'
    }
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null
    const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
    if (code === 'INVALID_EMAIL') throw new PasswordRecoveryError('email', 'Informe um e-mail válido.')
    if (code === 'INVALID_OR_EXPIRED_CODE') throw new PasswordRecoveryError('form', 'O link de recuperação é inválido ou expirou. Solicite um novo.')
    if (code === 'INVALID_PASSWORD') throw new PasswordRecoveryError('password', 'A senha não atende à política de segurança da conta. Escolha outra senha.')
    throw new PasswordRecoveryError('form', 'Não foi possível concluir a solicitação agora. Tente novamente.')
  } catch (error: unknown) {
    if (signal.aborted) throw new DOMException('Operação cancelada.', 'AbortError')
    if (error instanceof PasswordRecoveryError) throw error
    throw new PasswordRecoveryError('form', 'Não foi possível conectar ao serviço. Tente novamente.')
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}

export async function requestPasswordRecovery(email: string, signal: AbortSignal): Promise<RecoveryChallenge> {
  try {
    const errors = validateRecoveryEmail(email)
    if (errors.email) throw new PasswordRecoveryError('email', errors.email)
    const normalized = email.trim()
    const message = await post('/auth/forgot-password', { email: normalized }, signal)
    signal.throwIfAborted()
    challenge = { email: normalized, message }
    return { ...challenge }
  } catch (error: unknown) {
    if (signal.aborted || error instanceof PasswordRecoveryError) throw error
    throw new PasswordRecoveryError('form', 'Não foi possível concluir a solicitação agora. Tente novamente.')
  }
}

export async function replacePassword(values: PasswordRecoveryValues, code: string, signal: AbortSignal): Promise<void> {
  try {
    const errors = validatePasswordReplacement(values)
    const field = (Object.keys(errors) as (keyof PasswordRecoveryValues)[])[0]
    if (field) throw new PasswordRecoveryError(field, errors[field]!)
    if (!code || code.length > 2048 || /\s/.test(code)) throw new PasswordRecoveryError('form', 'O link de recuperação é inválido ou expirou. Solicite um novo.')
    await post('/auth/reset-password', { oobCode: code, newPassword: values.password }, signal)
  } catch (error: unknown) {
    if (signal.aborted || error instanceof PasswordRecoveryError) throw error
    throw new PasswordRecoveryError('form', 'Não foi possível concluir a solicitação agora. Tente novamente.')
  }
}
