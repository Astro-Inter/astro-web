import type { RegistrationSpreadsheetAnalysis, SpreadsheetImportError } from '../types/workspaceRegistration'
import { getSystemApiBaseUrl } from './systemApi'

export async function validateRegistrationEmails(emails: RegistrationSpreadsheetAnalysis['emails'], signal: AbortSignal): Promise<SpreadsheetImportError[]> {
  const group = new AbortController()
  const requestSignal = AbortSignal.any([signal, group.signal])
  try {
    const errors: SpreadsheetImportError[] = []
    let next = 0
    async function worker(): Promise<void> {
      while (next < emails.length) {
        requestSignal.throwIfAborted()
        const item = emails[next++]
        const response = await fetch(`${getSystemApiBaseUrl()}/verify-email`, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: item.email }),
          signal: AbortSignal.any([requestSignal, AbortSignal.timeout(30000)]),
        })
        requestSignal.throwIfAborted()
        // O contrato de /verify-email usa 404 para e-mail não cadastrado.
        if (response.status === 404) continue
        if (response.status !== 200) throw new Error('Consulta indisponível')
        const body: unknown = await response.json()
        if (!body || typeof body !== 'object' || !('success' in body) || body.success !== true
            || !('data' in body) || !body.data || typeof body.data !== 'object'
            || !('userType' in body.data) || typeof body.data.userType !== 'string') throw new Error('Resposta inválida')
        errors.push({ row: item.row, field: 'email', message: 'E-mail já cadastrado. Use outro e-mail para esta pessoa.' })
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, emails.length) }, () => worker()))
    return errors.sort((left, right) => left.row - right.row)
  } catch (error: unknown) {
    group.abort()
    if (signal.aborted) throw error
    throw new Error('Não foi possível verificar os e-mails da planilha. Tente novamente antes de continuar.', { cause: error })
  }
}
