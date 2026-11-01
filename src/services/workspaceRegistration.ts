import type { SpreadsheetImportError, WorkspaceRegistrationDraft, WorkspaceRegistrationResult } from '../types/workspaceRegistration'
import { buildWorkspaceRegistration } from '../utils/workspaceRegistration'
import { getSystemApiBaseUrl } from './systemApi'
import { registrationErrorMessage } from '../utils/registrationErrorFeedback'

const messages: Record<number, string> = {
  400: 'Há dados inválidos no cadastro. Revise os campos indicados e envie novamente.',
  409: 'Há dados já cadastrados ou unidades duplicadas. Confira o CNPJ, o e-mail e os nomes das unidades.',
  413: 'A planilha deve ter até 5 MB e o envio completo até 6 MB.',
  422: 'Há dados inválidos no cadastro ou na planilha. Corrija os campos ou as linhas indicadas e tente novamente.',
  500: 'Não foi possível concluir o cadastro. Confira a planilha e tente novamente.',
  503: 'O serviço de cadastro está indisponível. Tente novamente mais tarde.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readImportErrors(value: unknown): SpreadsheetImportError[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is SpreadsheetImportError => isRecord(item)
    && typeof item.row === 'number' && typeof item.field === 'string' && typeof item.message === 'string')
}

export class WorkspaceRegistrationError extends Error {
  readonly status: number
  readonly importErrors: SpreadsheetImportError[]

  constructor(message: string, status = 0, importErrors: SpreadsheetImportError[] = [], options?: ErrorOptions) {
    super(message, options)
    this.name = 'WorkspaceRegistrationError'
    this.status = status
    this.importErrors = importErrors
  }
}

export async function registerWorkspace(draft: WorkspaceRegistrationDraft): Promise<WorkspaceRegistrationResult> {
  try {
    const data = buildWorkspaceRegistration(draft)
    const apiBaseUrl = getSystemApiBaseUrl()
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    formData.append('file', draft.file!)
    const response = await fetch(`${apiBaseUrl}/register-workspace`, {
      method: 'POST', headers: { Accept: 'application/json' }, body: formData,
    })
    const body: unknown = await response.json().catch(() => null)
    if (response.status !== 201 || !isRecord(body) || body.success !== true) {
      const details = isRecord(body) ? body : {}
      const nestedData = isRecord(details.data) ? details.data : {}
      const nestedErrors = isRecord(details.errors) ? details.errors : {}
      const importErrors = [...new Map([
        details.importErrors, nestedData.importErrors, nestedErrors.importErrors, details.errors, details.data,
      ].flatMap(readImportErrors).map(item => [`${item.row}-${item.field}-${item.message}`, item] as const)).values()]
      const message = registrationErrorMessage(details, messages[response.status] ?? 'Não foi possível concluir o cadastro. Tente novamente.')
      throw new WorkspaceRegistrationError(message, response.status, importErrors)
    }
    if (!isRecord(body.data) || typeof body.data.workspaceId !== 'number') {
      throw new WorkspaceRegistrationError('A API confirmou o cadastro, mas retornou uma resposta inesperada. Tente entrar com seu e-mail e senha.', 201)
    }
    return { workspaceId: body.data.workspaceId, importErrors: readImportErrors(body.data.importErrors) }
  } catch (error: unknown) {
    if (error instanceof WorkspaceRegistrationError) throw error
    if (error instanceof TypeError) throw new WorkspaceRegistrationError('Não foi possível conectar à API. Confira sua conexão e tente novamente.', 0, [], { cause: error })
    throw new WorkspaceRegistrationError(error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.', 0, [], { cause: error })
  }
}
