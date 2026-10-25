export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error' | 'inactive'

export type WebAccountType = 'GESTOR' | 'GESTOR_WORKSPACE' | 'ADMIN'

export interface AuthenticatedUser {
  uid: string
  email: string | null
  displayName: string | null
  accountType: WebAccountType
}

export interface AuthenticationState {
  user: AuthenticatedUser | null
  status: 'loading' | 'authenticating' | 'ready' | 'error' | 'inactive'
  error: string
}

export interface AuthenticationContextValue extends AuthenticationState {
  retryAuthentication: () => void
}
