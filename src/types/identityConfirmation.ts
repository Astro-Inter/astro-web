export interface PasswordConfirmationState {
  password: string
  visible: boolean
  status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled'
  error: string
}

export interface PasswordConfirmationController extends PasswordConfirmationState {
  blocked: boolean
  updatePassword: (password: string) => void
  toggleVisibility: () => void
  submit: () => Promise<boolean>
  cancel: () => void
  consumeConfirmation: () => boolean
}
