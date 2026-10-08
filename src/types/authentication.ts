export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error'
