import type { PasswordRecoveryErrors, PasswordRecoveryValues } from '../types/passwordRecovery'
import { validateLoginCredentials } from './authentication'
import { validateRegistrationPasswordFields } from './workspaceRegistration'

export function validateRecoveryEmail(email: string): PasswordRecoveryErrors {
  if (email.trim().length > 254) return { email: 'O e-mail deve ter até 254 caracteres.' }
  const error = validateLoginCredentials({ email, password: '-' }).email
  return error ? { email: error } : {}
}

export function validatePasswordReplacement(values: PasswordRecoveryValues): PasswordRecoveryErrors {
  return validateRegistrationPasswordFields(values.password, values.confirmation)
}
