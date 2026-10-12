import { FirebaseError } from 'firebase/app'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { firebaseAuth } from './firebase'

const confirmationErrorMessages: Record<string, string> = {
  'auth/wrong-password': 'Senha incorreta. Tente novamente.',
  'auth/invalid-credential': 'Senha incorreta ou não foi possível confirmar sua identidade. Tente novamente.',
  'auth/invalid-login-credentials': 'Senha incorreta ou não foi possível confirmar sua identidade. Tente novamente.',
  'auth/user-mismatch': 'Sua sessão mudou. Cancele e tente novamente.',
  'auth/user-not-found': 'Não foi possível confirmar sua identidade. Entre novamente na sua conta.',
  'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o suporte.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente na sua conta.',
  'auth/invalid-user-token': 'Sua sessão expirou. Entre novamente na sua conta.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Não foi possível conectar. Confira sua conexão e tente novamente.',
  'auth/operation-not-allowed': 'A confirmação com senha não está disponível para esta conta.',
}

export function isCurrentAuthenticatedUser(userId: string | null): boolean {
  return userId !== null && firebaseAuth.currentUser?.uid === userId
}

/** Confirma apenas a identidade; a API continua responsável pela autorização. */
export async function confirmarIdentidadeDoUsuario(password: string, expectedUserId: string | null): Promise<void> {
  const user = firebaseAuth.currentUser
  if (!user?.email || !isCurrentAuthenticatedUser(expectedUserId)) {
    throw new Error('Sua sessão não está disponível ou mudou. Entre novamente na sua conta.')
  }
  if (!user.providerData.some(provider => provider.providerId === EmailAuthProvider.PROVIDER_ID)) {
    throw new Error('Esta conta não utiliza autenticação com e-mail e senha.')
  }
  if (!password.length) throw new Error('Informe sua senha atual.')
  if (password.length > 128) throw new Error('A senha deve ter no máximo 128 caracteres.')

  try {
    const credential = EmailAuthProvider.credential(user.email, password)
    await reauthenticateWithCredential(user, credential)
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      // Não propaga o erro original/credenciais para logs ou para a API própria.
      throw new Error(confirmationErrorMessages[error.code] ?? 'Não foi possível confirmar sua identidade. Tente novamente.')
    }
    throw new Error('Não foi possível confirmar sua identidade. Tente novamente.')
  }
  // A resposta de uma sessão anterior nunca libera uma ação na sessão nova.
  if (firebaseAuth.currentUser !== user || !isCurrentAuthenticatedUser(expectedUserId)) {
    throw new Error('Sua sessão mudou. Cancele e tente novamente.')
  }
}
