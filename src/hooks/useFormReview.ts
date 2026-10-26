import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getFormReview, submitFormReview } from '../services/formReview'
import { createFormReviewPreview } from '../data/formReviewPreview'
import { canReviewForm, createReviewDecision } from '../utils/formReview'
import { isFormId } from '../utils/formApi'
import type { FormReviewData, FormReviewStatus } from '../types/formReview'

interface FormReviewLoadState { key: string; data: FormReviewData | null; error: string; loading: boolean }
export function useFormReview(id: string | null, preview: boolean, scenario: FormReviewStatus) {
  const { user } = useAuthentication()
  const [attempt, setAttempt] = useState(0)
  const mutation = useRef<AbortController | null>(null)
  const [action, setAction] = useState({ key: '', submitting: false, error: '' })
  useEffect(() => () => { mutation.current?.abort(); mutation.current = null }, [user?.uid, id, preview])
  const key = JSON.stringify([user?.uid, id, preview, scenario, attempt])
  const invalidId = !preview && (!id || !isFormId(id))
  const [state, setState] = useState<FormReviewLoadState>({ key: '', data: null, error: '', loading: true })
  useEffect(() => {
    const controller = new AbortController()
    if (invalidId) return () => controller.abort()
    const request = preview ? Promise.resolve(createFormReviewPreview(scenario)) : getFormReview(id ?? '', controller.signal)
    void request.then(data => {
      if (!controller.signal.aborted) setState({ key, data, error: '', loading: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar as respostas.' })
    })
    return () => controller.abort()
  }, [key, id, preview, scenario, invalidId])
  const visible = invalidId ? { key, data: null, loading: false, error: 'Selecione um formulário válido para consultar as respostas.' }
    : state.key === key ? state : { key, data: null, error: '', loading: true }
  async function decide(status: 'approved' | 'rejected', description = ''): Promise<void> {
    if (!visible.data || !canReviewForm(visible.data, user?.accountType)) throw new Error('A validação não está disponível para este formulário.')
    if (mutation.current) throw new Error('Aguarde a análise em andamento.')
    const controller = new AbortController()
    mutation.current = controller
    setAction({ key, submitting: true, error: '' })
    try {
      const data = preview ? { ...visible.data, review: createReviewDecision(status, user?.displayName || 'Você', description) }
        : await submitFormReview(visible.data.form.id, status, description, controller.signal)
      controller.signal.throwIfAborted()
      setState(current => current.key === key ? { ...current, data } : current)
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        if (!preview && error instanceof Error && 'status' in error && error.status === 409) {
          try {
            const data = await getFormReview(visible.data.form.id, controller.signal)
            if (!controller.signal.aborted) setState(current => current.key === key ? { ...current, data } : current)
          } catch { /* A decisão não é reenviada automaticamente. */ }
        }
        if (!controller.signal.aborted) setAction({ key, submitting: false, error: error instanceof Error ? error.message : 'Não foi possível registrar a análise.' })
      }
      throw error
    } finally {
      if (mutation.current === controller) mutation.current = null
      if (!controller.signal.aborted) setAction(current => current.key === key ? { ...current, submitting: false } : current)
    }
  }
  return { ...visible, decide, submitting: action.key === key && action.submitting, decisionError: action.key === key ? action.error : '', retry: () => setAttempt(current => current + 1),
    canReview: !!visible.data && canReviewForm(visible.data, user?.accountType) }
}
