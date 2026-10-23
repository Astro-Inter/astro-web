import { firebaseAuth } from './firebase'
import { getSystemApiBaseUrl } from './systemApi'
import { formatCpfCnpj } from '../utils/inputFormatting'
import { isPositiveId, validateCollaborator } from '../utils/collaborator'
import type { Collaborator, CollaboratorDetails, CollaboratorDetailsResponse, CollaboratorFormValues, CollaboratorSummaryResponse, CreateCollaboratorRequest, UpdateCollaboratorRequest } from '../types/collaborator'

export class CollaboratorsApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CollaboratorsApiError'
  }
}

async function requestCollaborators<T>(path: string, method = 'GET', payload?: object, signal?: AbortSignal): Promise<T> {
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new CollaboratorsApiError('Entre na sua conta para gerenciar os colaboradores.')
    const token = await user.getIdToken()
    signal?.throwIfAborted()
    const response = await fetch(`${getSystemApiBaseUrl()}${path}`, {
      method, signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* Erros do servidor podem vir sem JSON. */ }
    const result = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.filter((item): item is string => typeof item === 'string').join(' ') : ''
      throw new CollaboratorsApiError(details || (typeof result?.message === 'string' && result.message) ||
        (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Você não tem permissão para gerenciar estes colaboradores.' : response.status === 404 ? 'Colaborador, cargo ou unidade não encontrado no seu escopo.' : 'Não foi possível concluir a operação de colaboradores. Tente novamente.'))
    }
    if (result?.success !== true) throw new CollaboratorsApiError('A API retornou uma resposta inválida para colaboradores.')
    return result.data as T
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof CollaboratorsApiError) throw error
    throw new CollaboratorsApiError('Não foi possível conectar à API de colaboradores. Tente novamente.', { cause: error })
  }
}

function collaboratorPath(id: string): string {
  if (!isPositiveId(id)) throw new CollaboratorsApiError('Identificador do colaborador inválido.')
  return `/collaborators/${id}`
}

function toCollaborator(row: CollaboratorSummaryResponse): Collaborator {
  if (!row || !Number.isSafeInteger(row.id_usuario) || row.id_usuario <= 0
    || !Number.isSafeInteger(row.cargo_id) || row.cargo_id <= 0 || !Number.isSafeInteger(row.unidade_id) || row.unidade_id <= 0
    || typeof row.nome !== 'string' || typeof row.email !== 'string' || typeof row.cargo !== 'string' || typeof row.unidade !== 'string'
    || !['PRE_CADASTRADO', 'ATIVO', 'DESATIVADO'].includes(row.status)
    || (row.profilePhotoUrl != null && typeof row.profilePhotoUrl !== 'string')
    || (row.avatarInitials != null && typeof row.avatarInitials !== 'string')) {
    throw new CollaboratorsApiError('A API retornou dados inválidos para o colaborador.')
  }
  return { id: String(row.id_usuario), name: row.nome, email: row.email, roleId: String(row.cargo_id), position: row.cargo,
    unitId: String(row.unidade_id), unit: row.unidade, status: row.status,
    profilePhotoUrl: row.profilePhotoUrl && /^https?:\/\//i.test(row.profilePhotoUrl) ? row.profilePhotoUrl : null,
    avatarInitials: row.avatarInitials || null }
}

function toDetails(row: CollaboratorDetailsResponse): CollaboratorDetails {
  const collaborator = toCollaborator(row)
  // CPF e modalidade podem estar nulos em registros existentes. A leitura
  // não deve exigir os campos obrigatórios do POST/PUT para abrir o cadastro.
  if (row.cpf != null && typeof row.cpf !== 'string') {
    throw new CollaboratorsApiError('A API retornou o CPF do colaborador em um formato inválido.')
  }
  if (row.modalidade != null && row.modalidade !== '' && !['HIBRIDO', 'REMOTO', 'PRESENCIAL'].includes(row.modalidade)) {
    throw new CollaboratorsApiError('A API retornou uma modalidade inválida para o colaborador.')
  }
  const cpf = row.cpf?.trim() ?? ''
  const digits = cpf.replace(/[.\-\s]/g, '')
  return { ...collaborator, cpf: /^\d{11}$/.test(digits) ? formatCpfCnpj(digits) : cpf, modality: row.modalidade || '' }
}

function collaboratorPayload(values: CollaboratorFormValues): CreateCollaboratorRequest {
  const errors = validateCollaborator(values)
  if (Object.keys(errors).length) throw new CollaboratorsApiError(Object.values(errors).join(' '))
  return { name: values.name.trim(), cpf: values.cpf.replace(/[.\-\s]/g, ''), email: values.email.trim().toLowerCase(),
    roleId: Number(values.roleId), unitId: Number(values.unitId), workModel: values.modality as CreateCollaboratorRequest['workModel'] }
}

export async function listCollaborators(signal?: AbortSignal): Promise<Collaborator[]> {
  const data = await requestCollaborators<CollaboratorSummaryResponse[]>('/collaborators', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new CollaboratorsApiError('A API retornou uma lista de colaboradores inválida.')
  return data.map(toCollaborator)
}

export async function getCollaborator(id: string, signal?: AbortSignal): Promise<CollaboratorDetails> {
  return toDetails(await requestCollaborators<CollaboratorDetailsResponse>(collaboratorPath(id), 'GET', undefined, signal))
}

export async function createCollaborator(values: CollaboratorFormValues): Promise<CollaboratorDetails> {
  return toDetails(await requestCollaborators<CollaboratorDetailsResponse>('/collaborators', 'POST', collaboratorPayload(values)))
}

export async function updateCollaborator(id: string, values: CollaboratorFormValues): Promise<CollaboratorDetails> {
  const payload: UpdateCollaboratorRequest = { ...collaboratorPayload(values), status: values.status }
  return toDetails(await requestCollaborators<CollaboratorDetailsResponse>(collaboratorPath(id), 'PUT', payload))
}

export async function changeCollaboratorStatus(id: string, status: 'ATIVO' | 'DESATIVADO'): Promise<CollaboratorDetails> {
  if (status !== 'ATIVO' && status !== 'DESATIVADO') throw new CollaboratorsApiError('Status inválido. Selecione ativo ou desativado.')
  return toDetails(await requestCollaborators<CollaboratorDetailsResponse>(`${collaboratorPath(id)}/status`, 'PATCH', { status }))
}
