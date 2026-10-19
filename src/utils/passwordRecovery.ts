import type { PasswordRecoveryErrors, PasswordRecoveryValues } from '../types/passwordRecovery'
import { validateLoginCredentials } from './authentication'
import { validateRegistrationPasswordFields } from './workspaceRegistration'

export function validateRecoveryEmail(email: string): PasswordRecoveryErrors {
  const error = validateLoginCredentials({ email, password: '-' }).email
  return error ? { email: error } : {}
}

export function validatePasswordReplacement(values: PasswordRecoveryValues): PasswordRecoveryErrors {
  return validateRegistrationPasswordFields(values.password, values.confirmation)
}
