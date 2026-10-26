import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getFormResponseImage } from '../services/formReview'
import type { FormResponseFile } from '../types/formReview'

export function useFormResponseImage(formId: string | null, file: FormResponseFile | null, preview: boolean) {
  const { user } = useAuthentication()
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([user?.uid, formId, file?.id, preview, attempt])
  const [state, setState] = useState({ key: '', url: null as string | null, error: '', loading: false })
  useEffect(() => {
    const controller = new AbortController()
    if (!file || !formId) return () => controller.abort()
    if (preview) return () => controller.abort()
    void getFormResponseImage(formId, file.id, controller.signal).then(image => {
      if (!controller.signal.aborted) setState({ key, url: image.url, error: '', loading: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, url: null, error: error instanceof Error ? error.message : 'Não foi possível abrir a imagem.', loading: false })
    })
    return () => controller.abort()
  }, [key, formId, file, preview])
  const visible = preview ? { key, url: file?.url ?? null, error: '', loading: false }
    : state.key === key ? state : { key, url: null, error: '', loading: !!file }
  return { ...visible, retry: () => setAttempt(value => value + 1),
    fail: () => setState({ key, url: null, loading: false, error: 'Não foi possível carregar a imagem. Tente novamente para renovar o acesso.' }) }
}
