import type { LoginCredentials, LoginFieldErrors } from '../types/authentication'

export function validateLoginCredentials(credentials: LoginCredentials): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const email = credentials.email.trim()

  if (!email) errors.email = 'Informe seu email.'
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Informe um email válido.'
  }

  if (!credentials.password) errors.password = 'Informe sua senha.'
  else if (credentials.password.length > 128) errors.password = 'A senha deve ter no máximo 128 caracteres.'

  return errors
}
