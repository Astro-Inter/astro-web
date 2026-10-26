export interface RecoveryChallenge {
  email: string
  message: string
}

export interface PasswordRecoveryValues {
  email: string
  password: string
  confirmation: string
}

export type PasswordRecoveryErrors = Partial<Record<keyof PasswordRecoveryValues | 'form', string>>
