import type { SpreadsheetImportError, WorkspaceRegistrationResult } from '../types/workspaceRegistration'

interface Feedback {
  error: string
  failureStatus: number
  importErrors: SpreadsheetImportError[]
}

export type RegistrationState =
  | (Feedback & { status: 'idle' | 'loading'; result: null })
  | (Feedback & { status: 'success'; result: WorkspaceRegistrationResult })
  | (Feedback & { status: 'error'; result: null })

export type RegistrationAction =
  | { type: 'started' }
  | { type: 'succeeded'; result: WorkspaceRegistrationResult }
  | ({ type: 'failed' } & Feedback)
  | { type: 'reset' }

export const initialRegistrationState: RegistrationState = {
  status: 'idle', result: null, error: '', failureStatus: 0, importErrors: [],
}

// Cada transição atualiza resultado e erros juntos: sucesso nunca retém erros anteriores.
export function registrationReducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  switch (action.type) {
    case 'started': return state.status === 'success' ? state : { ...initialRegistrationState, status: 'loading', result: null }
    case 'succeeded': return { ...initialRegistrationState, status: 'success', result: action.result }
    case 'failed': return { status: 'error', result: null, error: action.error, failureStatus: action.failureStatus, importErrors: action.importErrors }
    case 'reset': return initialRegistrationState
  }
}
