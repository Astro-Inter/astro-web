export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AuthenticatedUser {
  uid: string
  email: string | null
  displayName: string | null
}

export interface AuthenticationState {
  user: AuthenticatedUser | null
  status: 'loading' | 'ready' | 'error'
  error: string
}
