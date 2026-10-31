import { getForm, updateForm } from './forms'
import { formHasResponses, formSummary, formValues } from '../utils/formApi'
import { isFormCardAppearance } from '../data/formCardAppearance'
import type { FormCardAppearance, FormSummary } from '../types/forms'

export async function saveFormCardAppearance(id: string, appearance: FormCardAppearance, signal?: AbortSignal): Promise<FormSummary> {
  if (!isFormCardAppearance(appearance)) throw new Error('Escolha um ícone e uma cor válidos.')
  const current = await getForm(id, signal)
  signal?.throwIfAborted()
  if (formHasResponses(current)) throw new Error('O formulário já recebeu respostas e sua aparência não pode mais ser alterada.')
  const values = formValues(current)
  const limit = 100
  if (values.name.length > limit) throw new Error(`Para salvar a aparência, reduza o nome do formulário para até ${limit} caracteres.`)
  const saved = await updateForm(id, { ...values, appearance: { icon: appearance.icon, color: appearance.color } }, current, signal)
  signal?.throwIfAborted()
  const summary = formSummary({ ...saved, questionCount: saved.questions.length })
  if (summary.icon !== appearance.icon || summary.color !== appearance.color) throw new Error('A API não confirmou a aparência do card. Recarregue a lista antes de tentar novamente.')
  return summary
}