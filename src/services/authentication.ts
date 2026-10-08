import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import type { LoginCredentials } from '../types/authentication'
import { validateLoginCredentials } from '../utils/authentication'
import { firebaseAuth } from './firebase'

const authenticationErrorMessages: Record<string, string> = {
  'auth/invalid-credential': 'Email ou senha incorretos.',
  'auth/invalid-login-credentials': 'Email ou senha incorretos.',
  'auth/user-not-found': 'Email ou senha incorretos.',
  'auth/wrong-password': 'Email ou senha incorretos.',
  'auth/invalid-email': 'Informe um email válido.',
  'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o suporte.',
  'auth/too-many-requests': 'Muitas tentativas de login. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Não foi possível conectar. Confira sua conexão e tente novamente.',
  'auth/operation-not-allowed': 'O login com email e senha ainda não está disponível. Entre em contato com o suporte.',
}

export async function loginWithEmailAndPassword(credentials: LoginCredentials): Promise<UserCredential> {
  const errors = validateLoginCredentials(credentials)
  if (errors.email || errors.password) throw new Error(errors.email ?? errors.password)

  try {
    return await signInWithEmailAndPassword(firebaseAuth, credentials.email.trim(), credentials.password)
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new Error(authenticationErrorMessages[error.code] ?? 'Não foi possível entrar. Tente novamente.', { cause: error })
    }
    throw new Error('Não foi possível entrar. Tente novamente.', { cause: error })
  }
}
