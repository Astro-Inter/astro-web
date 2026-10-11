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

async function postWorkspaceEmail(path: string, data: { email: string; accessKey?: string }): Promise<void> {
  try {
    const isVerification = path.split('?')[0] === '/verify-key'
    const apiBaseUrl = getSystemApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (response.status === 204) return
    const body: unknown = await response.json().catch(() => null)
    const detail = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message.trim() : ''
    const message = detail || (response.status === 403 && isVerification
      ? 'A API recusou a verificação do código (403). Confira o código e o e-mail informado. Se estiverem corretos, será necessário verificar o serviço de validação.'
      : isVerification ? 'Não foi possível verificar o código. Tente novamente.' : 'Não foi possível solicitar o código. Tente novamente.')
    throw new WorkspaceEmailError(message, response.status)
  } catch (error: unknown) {
    if (error instanceof WorkspaceEmailError) throw error
    throw new WorkspaceEmailError('Não foi possível conectar à API. Confira sua conexão e tente novamente.', 0, { cause: error })
  }
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
