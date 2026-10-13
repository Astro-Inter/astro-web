import { validateManagerEmail, validateWorkspaceAccessKey } from '../utils/workspaceRegistration'
import { getSystemApiBaseUrl } from './systemApi'

export class WorkspaceEmailError extends Error {
  readonly status: number

  constructor(message: string, status = 0, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WorkspaceEmailError'
    this.status = status
  }
}

export function isWorkspaceCodeAlreadySent(error: unknown): boolean {
  if (!(error instanceof WorkspaceEmailError)) return false
  const message = error.message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return /ja.*(enviado|enviamos|solicitado)|ja existe uma solicitacao|already.*(sent|requested)/.test(message)
}

async function postWorkspaceEmail(path: string, data: { email?: string; accessKey?: string }): Promise<unknown> {
  const isCodeOnly = path === '/verify-workspace-key'
  const isVerification = isCodeOnly || path.split('?')[0] === '/verify-key'
  try {
    const apiBaseUrl = getSystemApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30000),
    })
    if (response.status === 204) return
    const rawBody = await response.text()
    let body: unknown
    try { body = JSON.parse(rawBody) } catch { body = rawBody }
    if (isCodeOnly && response.status === 200) return body
    const detail = typeof body === 'string'
      ? (response.status >= 500 || body.trim().startsWith('<') ? '' : body.trim())
      : typeof body === 'object' && body !== null
        ? ['message', 'detail', 'error'].map(key => key in body ? (body as Record<string, unknown>)[key] : undefined)
          .find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''
        : ''
    const message = response.status === 404
      ? `O serviço de ${isVerification ? 'verificação' : 'envio'} do código está indisponível. Tente novamente mais tarde.`
      : detail || (!isVerification && response.status === 409
      ? 'Já existe uma solicitação para este e-mail. Confira sua caixa de entrada e clique em “Verificar” para usar a chave recebida.'
      : response.status === 403 && isCodeOnly
      ? 'O serviço de verificação recusou a solicitação. Não foi possível confirmar a chave. Tente novamente mais tarde.'
      : response.status === 403 && isVerification
      ? 'Código inválido ou substituído. Confira seu e-mail novamente e use a nova chave recebida.'
      : isVerification ? 'Não foi possível verificar o código. Tente novamente.' : 'Não foi possível solicitar o código. Tente novamente.')
    throw new WorkspaceEmailError(message, response.status)
  } catch (error: unknown) {
    if (error instanceof WorkspaceEmailError) throw error
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new WorkspaceEmailError(isVerification
        ? 'A verificação demorou mais que o esperado. Tente verificar novamente.'
        : 'A solicitação demorou mais que o esperado. Confira se o código chegou ao seu e-mail antes de tentar novamente.', 0, { cause: error })
    }
    throw new WorkspaceEmailError('Não foi possível conectar à API. Confira sua conexão e tente novamente.', 0, { cause: error })
  }
}

export async function verifyWorkspaceKey(accessKey: string, requestedEmail = ''): Promise<string> {
  const error = validateWorkspaceAccessKey(accessKey)
  if (error) throw new WorkspaceEmailError(error)
  // O contrato publicado exige e-mail + chave. Só confirma o e-mail após
  // a API validar o par; não considera o rascunho uma verificação.
  if (!validateManagerEmail(requestedEmail)) {
    const email = requestedEmail.trim().toLowerCase()
    await verifyManagerEmail(email, accessKey)
    return email
  }
  const body = await postWorkspaceEmail('/verify-workspace-key', { accessKey })
  if (typeof body === 'object' && body !== null && 'success' in body && body.success === true
    && 'data' in body && typeof body.data === 'object' && body.data !== null
    && 'email' in body.data && typeof body.data.email === 'string' && !validateManagerEmail(body.data.email)) {
    return body.data.email.trim().toLowerCase()
  }
  throw new WorkspaceEmailError('A API não confirmou o e-mail associado à chave. Tente novamente.')
}

export async function addManagerEmail(email: string): Promise<void> {
  try {
    const error = validateManagerEmail(email)
    if (error) throw new WorkspaceEmailError(error)
    await postWorkspaceEmail('/add-manager-email', { email: email.trim().toLowerCase() })
  } catch (error: unknown) {
    if (error instanceof WorkspaceEmailError) throw error
    throw new WorkspaceEmailError('Não foi possível solicitar o código.', 0, { cause: error })
  }
}

export async function verifyManagerEmail(email: string, accessKey: string): Promise<void> {
  try {
    const error = validateManagerEmail(email) || validateWorkspaceAccessKey(accessKey)
    if (error) throw new WorkspaceEmailError(error)
    await postWorkspaceEmail('/verify-key?tipoConta=GESTOR_WORKSPACE', { email: email.trim().toLowerCase(), accessKey })
  } catch (error: unknown) {
    if (error instanceof WorkspaceEmailError) throw error
    throw new WorkspaceEmailError('Não foi possível verificar o código.', 0, { cause: error })
  }
}
