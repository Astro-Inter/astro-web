import type { WorkspaceRegistrationDraft, WorkspaceRegistrationResult } from '../types/workspaceRegistration'
import type { RegistrationState } from './workspaceRegistrationReducer'
import type { WorkspaceUnitAddress } from '../types/address'

export interface RegistrationSnapshot {
  draft: WorkspaceRegistrationDraft
  verifiedEmail: string
  state: RegistrationState
}

interface StoredSnapshot {
  id: string
  _versao: 1
  savedAt: number
  key: CryptoKey
  iv: Uint8Array<ArrayBuffer>
  encrypted: ArrayBuffer
}

const TAB_KEY = 'astro.workspace-registration-tab'
const MAX_AGE = 24 * 60 * 60 * 1000
let queue: Promise<void> = Promise.resolve()

function sessionId(): string {
  const existing = sessionStorage.getItem(TAB_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem(TAB_KEY, id)
  return id
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('astro-registration', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Armazenamento indisponível.'))
  })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUnit(value: unknown): value is WorkspaceUnitAddress {
  return isObject(value) && typeof value.id === 'number' && Number.isSafeInteger(value.id)
    && (value.source === undefined || value.source === 'spreadsheet' || value.source === 'manual')
    && ['name', 'cep', 'state', 'city', 'neighborhood', 'street', 'number', 'complement'].every(field => typeof value[field] === 'string')
}

function isResult(value: unknown): value is WorkspaceRegistrationResult {
  return isObject(value) && typeof value.workspaceId === 'number' && Array.isArray(value.importErrors)
    && value.importErrors.every(item => isObject(item) && typeof item.row === 'number' && typeof item.field === 'string' && typeof item.message === 'string')
}

// Senha, dados da empresa e bytes da planilha ficam no mesmo conteúdo cifrado.
// A chave não exportável é guardada pelo IndexedDB; nenhum segredo vai para Web Storage.
export async function encryptRegistrationSnapshot(snapshot: RegistrationSnapshot, id: string): Promise<StoredSnapshot> {
  const file = snapshot.draft.file
  const metadata = new TextEncoder().encode(JSON.stringify({
    _versao: 1,
    ...snapshot,
    draft: { ...snapshot.draft, file: file ? { name: file.name, type: file.type, lastModified: file.lastModified } : null },
  }))
  const prefix = new ArrayBuffer(4)
  new DataView(prefix).setUint32(0, metadata.byteLength)
  const bytes = await new Blob([prefix, metadata, ...(file ? [file] : [])]).arrayBuffer()
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  return { id, _versao: 1, savedAt: Date.now(), key, iv, encrypted }
}

export async function decryptRegistrationSnapshot(record: unknown): Promise<RegistrationSnapshot | null> {
  if (!isObject(record) || record._versao !== 1 || typeof record.savedAt !== 'number'
    || Date.now() - record.savedAt > MAX_AGE || !(record.key instanceof CryptoKey)
    || !(record.iv instanceof Uint8Array) || !(record.encrypted instanceof ArrayBuffer)) return null
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, record.key, record.encrypted)
  const length = new DataView(bytes).getUint32(0)
  if (length > bytes.byteLength - 4) return null
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes.slice(4, 4 + length)))
  if (!isObject(data) || data._versao !== 1 || !isObject(data.draft) || typeof data.verifiedEmail !== 'string' || !isObject(data.state)) return null
  const draft = data.draft
  if (typeof draft.email !== 'string' || typeof draft.password !== 'string' || !isObject(draft.company)
    || typeof draft.company.name !== 'string' || typeof draft.company.cnpj !== 'string'
    || !Array.isArray(draft.units) || !draft.units.every(isUnit)) return null
  let file: File | null = null
  if (draft.file !== null) {
    if (!isObject(draft.file) || typeof draft.file.name !== 'string' || typeof draft.file.type !== 'string' || typeof draft.file.lastModified !== 'number') return null
    file = new File([bytes.slice(4 + length)], draft.file.name, { type: draft.file.type, lastModified: draft.file.lastModified })
  }
  const status = data.state.status
  if (!['idle', 'loading', 'success', 'error'].includes(String(status))) return null
  const result = isResult(data.state.result) ? data.state.result : null
  if (status === 'success' && !result) return null
  const state: RegistrationState = result
    ? { status: 'success', result, error: '', failureStatus: 0, importErrors: [] }
    : {
      status: status === 'loading' || status === 'error' ? 'error' : 'idle', result: null,
      error: status === 'loading' ? 'O cadastro foi interrompido ao atualizar a página. Confira se o workspace foi criado antes de tentar novamente.' : typeof data.state.error === 'string' ? data.state.error : '',
      failureStatus: typeof data.state.failureStatus === 'number' ? data.state.failureStatus : 0,
      importErrors: [],
    }
  return { draft: { email: draft.email, password: draft.password, company: { name: draft.company.name, cnpj: draft.company.cnpj }, units: draft.units, file }, verifiedEmail: data.verifiedEmail === draft.email.trim() ? data.verifiedEmail : '', state }
}

export async function readRegistrationSession(): Promise<RegistrationSnapshot | null> {
  let database: IDBDatabase | undefined
  try {
    const id = sessionId()
    database = await openDatabase()
    const record: unknown = await new Promise((resolve, reject) => {
      const transaction = database!.transaction('drafts', 'readwrite')
      const store = transaction.objectStore('drafts')
      const cursor = store.openCursor()
      cursor.onsuccess = () => {
        const item = cursor.result
        if (!item) return
        const value: unknown = item.value
        if (!isObject(value) || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > MAX_AGE) item.delete()
        item.continue()
      }
      const request = store.get(id)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    return await decryptRegistrationSnapshot(record)
  } catch { return null } finally { database?.close() }
}

export function saveRegistrationSession(snapshot: RegistrationSnapshot | null): Promise<void> {
  // Serializa as gravações para uma leitura antiga nunca sobrescrever a seleção nova.
  queue = queue.then(async () => {
    let database: IDBDatabase | undefined
    try {
      const id = sessionId()
      const record = snapshot ? await encryptRegistrationSnapshot(snapshot, id) : null
      database = await openDatabase()
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction('drafts', 'readwrite')
        const store = transaction.objectStore('drafts')
        if (record) store.put(record)
        else store.delete(id)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
    } finally { database?.close() }
  }).catch(() => { /* Em navegadores sem armazenamento, o cadastro continua em memória. */ })
  return queue
}
