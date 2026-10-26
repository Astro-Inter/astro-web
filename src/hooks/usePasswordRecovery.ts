import { useEffect, useRef, useState } from 'react'
import type { PasswordRecoveryErrors, PasswordRecoveryValues } from '../types/passwordRecovery'
import { getPasswordRecoveryRetrySeconds, getRecoveryChallenge, PasswordRecoveryError, replacePassword, requestPasswordRecovery } from '../services/passwordRecovery'
import { validatePasswordReplacement, validateRecoveryEmail } from '../utils/passwordRecovery'

export function usePasswordRecovery(initialEmail = '', oobCode = '') {
  const [values, setValues] = useState<PasswordRecoveryValues>(() => ({ email: getRecoveryChallenge()?.email ?? initialEmail, password: '', confirmation: '' }))
  const [errors, setErrors] = useState<PasswordRecoveryErrors>({})
  const [pending, setPending] = useState(false)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(getPasswordRecoveryRetrySeconds)
  const coolingDown = retryAfterSeconds > 0
  useEffect(() => {
    if (!coolingDown) return
    const timer = setInterval(() => setRetryAfterSeconds(getPasswordRecoveryRetrySeconds()), 1000)
    return () => clearInterval(timer)
  }, [coolingDown])
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => { controllerRef.current?.abort(); controllerRef.current = null }, [])

  function update(field: keyof PasswordRecoveryValues, value: string) {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  async function submit(mode: 'request' | 'replace'): Promise<boolean> {
    if (controllerRef.current || getPasswordRecoveryRetrySeconds()) return false
    const validation = mode === 'request' ? validateRecoveryEmail(values.email) : validatePasswordReplacement(values)
    setErrors(validation)
    if (Object.keys(validation).length) return false
    const controller = new AbortController()
    controllerRef.current = controller
    setPending(true)
    try {
      if (mode === 'request') await requestPasswordRecovery(values.email, controller.signal)
      else {
        await replacePassword(values, oobCode, controller.signal)
        setValues(current => ({ ...current, password: '', confirmation: '' }))
      }
      return true
    } catch (error: unknown) {
      if (controller.signal.aborted) return false
      setRetryAfterSeconds(getPasswordRecoveryRetrySeconds())
      const field = error instanceof PasswordRecoveryError ? error.field : mode === 'request' ? 'email' : 'form'
      setErrors({ [field]: error instanceof Error ? error.message : 'Não foi possível continuar. Tente novamente.' })
      return false
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; if (!controller.signal.aborted) setPending(false) }
    }
  }

  return { values, errors, pending, retryAfterSeconds, update, submit }
}
