import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { AccountProfile, AccountProfileResponse } from '../types/account'
import { validateAccountPhoto } from '../utils/account'

export class AccountApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccountApiError'
  }
}

const modalities: Record<string, string> = { PRESENCIAL: 'Presencial', HIBRIDO: 'Híbrido', REMOTO: 'Remoto' }

function toAccountProfile(value: unknown): AccountProfile {
  if (typeof value !== 'object' || value === null) throw new AccountApiError('A API retornou dados inválidos para sua conta.')
  const data = value as Partial<AccountProfileResponse>
  if (typeof data.nome !== 'string' || !data.nome.trim()
    || [data.email, data.cargo, data.unidade, data.modalidade, data.profilePhotoUrl].some(field => field != null && typeof field !== 'string')) {
    throw new AccountApiError('A API retornou dados inválidos para sua conta.')
  }
  const modality = data.modalidade?.trim() ?? ''
  const photoUrl = data.profilePhotoUrl?.trim()
  return {
    name: data.nome.trim(), email: data.email?.trim() ?? '', position: data.cargo?.trim() ?? '',
    units: data.unidade?.trim() ?? '', modality: Object.hasOwn(modalities, modality) ? modalities[modality] : modality,
    photoUrl: photoUrl && /^https?:\/\//i.test(photoUrl) ? photoUrl : undefined,
  }
}

export async function getAccountProfile(signal?: AbortSignal): Promise<AccountProfile> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new AccountApiError('Entre na sua conta para consultar seu perfil.')
    signal?.throwIfAborted()
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    const response = await fetch(`${getSystemApiBaseUrl()}/user/me`, {
      signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const text = await response.text()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* O servidor pode responder sem JSON. */ }
    if (!response.ok) {
      throw new AccountApiError(response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
        : response.status === 403 ? 'Você não tem permissão para consultar este perfil.'
          : response.status === 404 ? 'Seu perfil não foi encontrado.' : 'Não foi possível carregar sua conta. Tente novamente.')
    }
    if (typeof body !== 'object' || body === null || !('success' in body) || body.success !== true || !('data' in body)) {
      throw new AccountApiError('A API retornou uma resposta inválida para sua conta.')
    }
    return toAccountProfile(body.data)
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof AccountApiError) throw error
    throw new AccountApiError('Não foi possível conectar para carregar sua conta. Tente novamente.')
  }
}

export async function updateAccountPhoto(file: File, signal?: AbortSignal): Promise<void> {
  try {
    const validationError = validateAccountPhoto(file)
    if (validationError) throw new AccountApiError(validationError)
    const user = firebaseAuth.currentUser
    if (!user) throw new AccountApiError('Entre na sua conta para alterar a foto.')
    signal?.throwIfAborted()
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    const body = new FormData()
    body.append('file', file)
    const timeout = AbortSignal.timeout(60000)
    const response = await fetch(`${getSystemApiBaseUrl()}/user/me/profile-photo`, {
      method: 'PUT', body,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    if (response.status !== 204) {
      throw new AccountApiError(response.status === 400 ? 'A imagem foi recusada. Use JPEG, PNG ou WebP de até 5 MB.'
        : response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
          : response.status === 403 ? 'Você não tem permissão para alterar esta foto.'
            : response.status === 404 ? 'Seu perfil não foi encontrado.'
              : response.status === 413 ? 'A foto excede o limite permitido. Escolha uma imagem menor.'
                : 'Não foi possível salvar sua foto. Tente novamente.')
    }
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof AccountApiError) throw error
    throw new AccountApiError('Não foi possível enviar sua foto. Confira sua conexão e tente novamente.')
  }
}
