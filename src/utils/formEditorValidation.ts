import type { CreateFormValues, FormEditorOptions } from '../types/forms'
import { isFormReferenceId } from './formApi'
import { validateAndSanitizeForm, type FormValidation } from './forms'

export function validateFormNrOption(nr: string, options: FormEditorOptions['nrs'], context: 'saved' | 'submission' = 'submission'): string | undefined {
  if (!nr || options.some(option => option.value === nr)) return undefined
  return context === 'saved'
    ? 'A NR salva não está disponível no catálogo de empresa. Selecione uma NR de empresa ou remova o vínculo.'
    : 'Selecione uma NR de empresa ou remova o vínculo antes de salvar.'
}

export function validateAndSanitizeFormForOptions(input: CreateFormValues, options: FormEditorOptions, draft = false): FormValidation {
  const result = validateAndSanitizeForm(input, draft)
  const { values, errors } = result
  for (const [field, label] of [['manager', 'gestor'], ['nr', 'NR'], ['unit', 'unidade']] as const) {
    if (values[field] && !isFormReferenceId(values[field])) errors[field] = `Selecione um identificador válido para ${label}.`
  }
  const nrError = validateFormNrOption(values.nr, options.nrs)
  if (nrError) errors.nr = nrError
  if (values.manager && (values.manager === options.currentManagerId || options.managersError
    || !options.managers.some(manager => manager.value === values.manager))) errors.manager = 'Selecione outro gestor ativo para receber o formulário.'
  return result
}
