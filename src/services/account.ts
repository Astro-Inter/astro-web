import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { AccountProfile, AccountProfileResponse } from '../types/account'

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
