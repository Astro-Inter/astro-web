import { FirebaseError } from 'firebase/app'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import type { AuthenticatedUser, LoginCredentials } from '../types/authentication'
import { validateLoginCredentials } from '../utils/authentication'
import { firebaseAuth } from './firebase'

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

export class AuthenticationError extends Error {
  readonly invalidCredentials: boolean

  constructor(message: string, cause: unknown, invalidCredentials = false) {
    super(message, { cause })
    this.name = 'AuthenticationError'
    this.invalidCredentials = invalidCredentials
  }
}

export async function loginWithEmailAndPassword(credentials: LoginCredentials): Promise<UserCredential> {
  const errors = validateLoginCredentials(credentials)
  if (errors.email || errors.password) throw new Error(errors.email ?? errors.password)

  try {
    return await signInWithEmailAndPassword(firebaseAuth, credentials.email.trim(), credentials.password)
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new AuthenticationError(
        authenticationErrorMessages[error.code] ?? 'Não foi possível entrar. Tente novamente.',
        error,
        invalidCredentialCodes.has(error.code),
      )
    }
    throw new AuthenticationError('Não foi possível entrar. Tente novamente.', error)
  }
}

export function observeAuthentication(
  onUserChanged: (user: AuthenticatedUser | null) => void,
  onError: (message: string) => void,
): () => void {
  try {
    return onAuthStateChanged(firebaseAuth, (user) => {
      onUserChanged(user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null)
    }, () => onError('Não foi possível verificar sua sessão. Atualize a página para tentar novamente.'))
  } catch {
    onError('Não foi possível verificar sua sessão. Atualize a página para tentar novamente.')
    return () => {}
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(firebaseAuth)
  } catch (error: unknown) {
    throw new AuthenticationError('Não foi possível sair da conta. Tente novamente.', error)
  }
}
