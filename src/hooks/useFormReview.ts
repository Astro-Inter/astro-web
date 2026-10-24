import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getFormReview } from '../services/formReview'
import { createFormReviewPreview } from '../data/formReviewPreview'
import { canReviewForm, createReviewDecision } from '../utils/formReview'
import { isFormId } from '../utils/formApi'
import type { FormReviewData, FormReviewStatus } from '../types/formReview'

interface FormReviewLoadState { key: string; data: FormReviewData | null; error: string; loading: boolean }
export function useFormReview(id: string | null, preview: boolean, scenario: FormReviewStatus) {
  const { user } = useAuthentication()
  const [attempt, setAttempt] = useState(0)
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
  function decide(status: 'approved' | 'rejected', description = ''): void {
    if (!preview || !visible.data || !canReviewForm(visible.data, user?.accountType)) throw new Error('A validação não está disponível para este formulário.')
    const review = createReviewDecision(status, user?.displayName || 'Você', description)
    setState(current => current.key === key && current.data?.review.status === 'awaiting_review'
      ? { ...current, data: { ...current.data, review } } : current)
  }
  return { ...visible, decide, retry: () => setAttempt(current => current + 1),
    canReview: !!visible.data && canReviewForm(visible.data, user?.accountType) }
}
