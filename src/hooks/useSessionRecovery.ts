import { useAuthentication } from './useAuthentication'
import { useLogout } from './useLogout'

interface UseSessionRecoveryResult {
  pending: boolean
  error: string
  retry: () => void
  returnToLogin: () => Promise<void>
}

export function useSessionRecovery(): UseSessionRecoveryResult {
  const { retryAuthentication } = useAuthentication()
  const { pending, error, submit } = useLogout()

  function retry(): void {
    if (!pending) retryAuthentication()
  }

  return { pending, error, retry, returnToLogin: submit }
}
