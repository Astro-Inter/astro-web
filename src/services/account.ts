import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import type { AccountDetails, AccountFormValues, AccountProfile, AccountProfileResponse, UpdateAccountDetailsRequest } from '../types/account'
import { validateAccountDetails, validateAccountPhoto } from '../utils/account'
import { formatCpfCnpj } from '../utils/inputFormatting'
import { reload, sendEmailVerification } from 'firebase/auth'

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

async function requestAccount(path: string, signal?: AbortSignal, payload?: UpdateAccountDetailsRequest): Promise<unknown> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new AccountApiError('Entre na sua conta para consultar seu perfil.')
    signal?.throwIfAborted()
    const token = await user.getIdToken(path.endsWith('account-details'))
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method: payload ? 'PUT' : 'GET',
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    })
    const text = await response.text()
    signal?.throwIfAborted()
    if (firebaseAuth.currentUser !== user) throw new AccountApiError('Sua sessão mudou. Entre novamente na sua conta.')
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* O servidor pode responder sem JSON. */ }
    if (!response.ok || (typeof body === 'object' && body !== null && 'success' in body && body.success === false)) {
      const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new AccountApiError(details || (typeof result?.message === 'string' && result.message) || (response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
        : response.status === 403 ? 'Você não tem permissão para consultar este perfil.'
          : response.status === 404 ? 'Seu perfil não foi encontrado.' : response.status === 409 ? 'CPF ou e-mail em conflito. Confira os dados da conta.' : 'Não foi possível concluir a operação da conta. Tente novamente.'))
    }
    if (typeof body !== 'object' || body === null || !('success' in body) || body.success !== true || !('data' in body)) {
      throw new AccountApiError('A API retornou uma resposta inválida para sua conta.')
    }
    return body.data
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof AccountApiError) throw error
    throw new AccountApiError('Não foi possível conectar para carregar sua conta. Tente novamente.')
  }
}

export async function getAccountProfile(signal?: AbortSignal): Promise<AccountProfile> {
  const data = await requestAccount('/user/me/account-summary', signal)
  // A consulta inicial não conserva campos extras de uma resposta indevida.
  const profile = toAccountProfile(data)
  return { name: profile.name, email: profile.email, photoUrl: profile.photoUrl, position: '', units: '', modality: '' }
}

function toAccountDetails(value: unknown): AccountDetails {
  const profile = toAccountProfile(value)
  const data = value as Record<string, unknown>
  if ((data.cpf != null && typeof data.cpf !== 'string')
    || [data.roleId, data.unitId].some(id => id != null && (!Number.isSafeInteger(id) || Number(id) <= 0))
    || (data.modalidade != null && !['HIBRIDO', 'REMOTO', 'PRESENCIAL'].includes(String(data.modalidade)))) {
    throw new AccountApiError('A API retornou detalhes inválidos para sua conta.')
  }
  const cpf = typeof data.cpf === 'string' ? data.cpf.trim() : ''
  return { ...profile, cpf: /^\d{11}$/.test(cpf) ? formatCpfCnpj(cpf) : cpf,
    roleId: data.roleId == null ? '' : String(data.roleId), unitId: data.unitId == null ? '' : String(data.unitId),
    workModel: data.modalidade == null ? '' : data.modalidade as AccountDetails['workModel'] }
}

export async function getAccountDetails(signal?: AbortSignal): Promise<AccountDetails> {
  return toAccountDetails(await requestAccount('/user/me/account-details', signal))
}

export async function updateAccountDetails(values: AccountFormValues, signal?: AbortSignal): Promise<AccountDetails> {
  const errors = validateAccountDetails(values)
  if (Object.keys(errors).length) throw new AccountApiError(Object.values(errors).join(' '))
  return toAccountDetails(await requestAccount('/user/me/account-details', signal, {
    name: values.name.trim(), cpf: values.cpf.replace(/[.\-\s]/g, ''), email: values.email.trim().toLowerCase(),
    roleId: Number(values.roleId), unitId: Number(values.unitId), workModel: values.workModel,
  }))
}

export async function refreshAccountIdentity(): Promise<void> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error()
    await reload(user)
    if (firebaseAuth.currentUser !== user) throw new Error()
    await user.getIdToken(true)
  } catch {
    throw new AccountApiError('Os dados foram salvos. Entre novamente para atualizar sua sessão e confirmar o novo e-mail.')
  }
}

export async function sendAccountEmailVerification(): Promise<void> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error()
    await reload(user)
    if (firebaseAuth.currentUser !== user) throw new Error()
    await sendEmailVerification(user)
  } catch {
    throw new AccountApiError('Não foi possível enviar a confirmação. Entre novamente e tente outra vez.')
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
