import { FirebaseError } from 'firebase/app'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import type { AuthenticatedUser, LoginCredentials, WebAccountType } from '../types/authentication'
import { validateLoginCredentials } from '../utils/authentication'
import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'

const authenticationErrorMessages: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválido(s).',
  'auth/invalid-login-credentials': 'E-mail ou senha inválido(s).',
  'auth/user-not-found': 'E-mail ou senha inválido(s).',
  'auth/wrong-password': 'E-mail ou senha inválido(s).',
  'auth/invalid-email': 'Informe um email válido.',
  'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o suporte.',
  'auth/too-many-requests': 'Muitas tentativas de login. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Não foi possível conectar. Confira sua conexão e tente novamente.',
  'auth/operation-not-allowed': 'O login com email e senha ainda não está disponível. Entre em contato com o suporte.',
}

const invalidCredentialCodes = new Set([
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/user-not-found',
  'auth/wrong-password',
])

// Disponível apenas durante a tentativa de login. Sessões restauradas consultam a API novamente.
let pendingLoginAccess: { email: string; accountType: WebAccountType } | null = null

export class AuthenticationError extends Error {
  readonly invalidCredentials: boolean

  constructor(message: string, cause: unknown, invalidCredentials = false) {
    super(message, { cause })
    this.name = 'AuthenticationError'
    this.invalidCredentials = invalidCredentials
  }
}

async function verifyLoginEmail(email: string, signal?: AbortSignal): Promise<WebAccountType> {
  const verificationError = 'Não conseguimos verificar seu email agora. Confira sua conexão e tente novamente.'

  try {
    const response = await fetch(`${getSystemApiBaseUrl()}/verify-email`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    })
    if (response.status === 404) {
      throw new AuthenticationError('Email não cadastrado. Confira o email informado.', undefined)
    }
    if (response.status !== 200) throw new AuthenticationError(verificationError, undefined)

    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null || !('success' in body) || body.success !== true
      || !('data' in body) || typeof body.data !== 'object' || body.data === null || !('userType' in body.data)) {
      throw new AuthenticationError(verificationError, undefined)
    }
    if (body.data.userType === 'COLABORADOR') {
      throw new AuthenticationError('O acesso ao painel é permitido apenas para gestores e gestores de workspace.', undefined)
    }
    if (body.data.userType !== 'GESTOR' && body.data.userType !== 'GESTOR_WORKSPACE') {
      throw new AuthenticationError(verificationError, undefined)
    }
    return body.data.userType
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) throw error
    throw new AuthenticationError(verificationError, error)
  }
}

export async function loginWithEmailAndPassword(credentials: LoginCredentials): Promise<UserCredential> {
  const errors = validateLoginCredentials(credentials)
  if (errors.email || errors.password) throw new Error(errors.email ?? errors.password)

  const email = credentials.email.trim().toLowerCase()
  const accountType = await verifyLoginEmail(email)
  const access = { email, accountType }
  pendingLoginAccess = access

  try {
    return await signInWithEmailAndPassword(firebaseAuth, email, credentials.password)
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new AuthenticationError(
        authenticationErrorMessages[error.code] ?? 'Não foi possível entrar. Tente novamente.',
        error,
        invalidCredentialCodes.has(error.code),
      )
    }
    throw new AuthenticationError('Não foi possível entrar. Tente novamente.', error)
  } finally {
    if (pendingLoginAccess === access) pendingLoginAccess = null
  }
}

export function observeAuthentication(
  onUserChanged: (user: AuthenticatedUser | null) => void,
  onError: (message: string) => void,
  onVerificationStarted?: () => void,
): () => void {
  let active = true
  let revision = 0
  let controller: AbortController | undefined

  try {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      const currentRevision = ++revision
      controller?.abort()
      if (!active) return
      if (!user) {
        onUserChanged(null)
        return
      }

      onVerificationStarted?.()
      controller = new AbortController()
      try {
        if (!user.email) throw new AuthenticationError('Sua sessão não possui um email válido.', undefined)
        const email = user.email.trim().toLowerCase()
        const accountType = pendingLoginAccess?.email === email
          ? pendingLoginAccess.accountType
          : await verifyLoginEmail(email, controller.signal)
        if (active && currentRevision === revision) {
          onUserChanged({ uid: user.uid, email: user.email, displayName: user.displayName, accountType })
        }
      } catch (error: unknown) {
        if (active && currentRevision === revision) {
          onError(error instanceof Error ? error.message : 'Não foi possível verificar sua sessão. Tente novamente.')
        }
      }
    }, () => {
      revision++
      controller?.abort()
      if (active) onError('Não foi possível verificar sua sessão. Tente novamente.')
    })
    return () => { active = false; revision++; controller?.abort(); unsubscribe() }
  } catch {
    onError('Não foi possível verificar sua sessão. Tente novamente.')
    return () => {}
  }
}

export async function logout(): Promise<void> {
  try {
    pendingLoginAccess = null
    await signOut(firebaseAuth)
  } catch (error: unknown) {
    throw new AuthenticationError('Não foi possível sair da conta. Tente novamente.', error)
  }
}
