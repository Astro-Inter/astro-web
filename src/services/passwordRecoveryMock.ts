import type { PasswordRecoveryValues, RecoveryChallenge } from '../types/passwordRecovery'
import { validateRecoveryEmail, validatePasswordReplacement } from '../utils/passwordRecovery'

const registeredEmails = new Set(['gestor@astro.com', 'workspace@astro.com'])
let challenge: RecoveryChallenge | null = null

export class PasswordRecoveryMockError extends Error {
  readonly field: keyof PasswordRecoveryValues

  constructor(field: keyof PasswordRecoveryValues, message: string) {
    super(message)
    this.field = field
  }
}

function wait(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const abort = () => { clearTimeout(timer); reject(new DOMException('Operação cancelada.', 'AbortError')) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 500)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export function getRecoveryChallenge(): RecoveryChallenge | null {
  return challenge ? { ...challenge } : null
}

export async function requestPasswordRecovery(email: string, signal: AbortSignal): Promise<RecoveryChallenge> {
  const errors = validateRecoveryEmail(email)
  if (errors.email) throw new PasswordRecoveryMockError('email', errors.email)
  await wait(signal)
  signal.throwIfAborted()
  const normalizedEmail = email.trim().toLowerCase()
  if (!registeredEmails.has(normalizedEmail)) throw new PasswordRecoveryMockError('email', 'Este e-mail não está cadastrado no Astro.')
  challenge = { email: normalizedEmail }
  return { ...challenge }
}

export async function replacePassword(values: PasswordRecoveryValues, signal: AbortSignal): Promise<void> {
  const errors = validatePasswordReplacement(values)
  const field = (Object.keys(errors) as (keyof PasswordRecoveryValues)[])[0]
  if (field) throw new PasswordRecoveryMockError(field, errors[field]!)
  await wait(signal)
  signal.throwIfAborted()
  // O mock valida o fluxo, sem gravar senhas ou alterar contas reais.
}
