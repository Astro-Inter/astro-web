import type { CreateFormValues, FormQuestion, FormQuestionKind } from '../types/forms'
import { formCardTitleLimit } from './cardTitleMetadata'

export function makeQuestion(kind: FormQuestionKind): FormQuestion {
  return {
    id: crypto.randomUUID(), kind, title: '', answer: '',
    options: kind === 'option' ? [{ id: crypto.randomUUID(), value: '' }, { id: crypto.randomUUID(), value: '' }] : [],
    multiple: false, required: false,
    ...(kind === 'photo' ? { maxFiles: 1, maxFileSizeMb: 10 } : {}),
  }
}

export function otherOptionsLast(options: FormQuestion['options']) {
  return [...options.filter((option) => !option.isOther), ...options.filter((option) => option.isOther)]
}

export function validateForm(values: CreateFormValues, deadlineValid = true): string | null {
  if (!deadlineValid) return 'Informe uma data limite válida ou deixe o campo vazio.'
  return Object.values(validateAndSanitizeForm(values).errors)[0] ?? null
}

export interface FormValidation {
  values: CreateFormValues
  errors: Record<string, string>
}

export function validateAndSanitizeForm(input: CreateFormValues, draft = false): FormValidation {
  const values: CreateFormValues = {
    ...input, name: input.name.trim(), description: input.description.trim(),
    manager: input.manager.trim(), nr: input.nr.trim(), unit: input.unit.trim(), deadline: input.deadline.trim(),
    questions: input.questions.map(question => ({ ...question, title: question.title.trim(),
      options: question.options.map(option => ({ ...option, value: option.value.trim() })),
    })),
  }
  const errors: Record<string, string> = {}
  const nameLimit = formCardTitleLimit(values.appearance)
  if ((!draft && !values.name) || values.name.length > nameLimit) errors.name = `Informe um nome de até ${nameLimit} caracteres.`
  if (!draft && !values.description) errors.description = 'Informe a descrição do formulário.'
  else if (values.description.length > 240) errors.description = 'A descrição deve ter até 240 caracteres.'
  if ((!draft && !values.manager) || values.manager.length > 200) errors.manager = 'Selecione um gestor válido.'
  for (const field of ['nr', 'unit'] as const) if (values[field].length > 200) errors[field] = 'Selecione uma opção válida.'
  if (values.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline)
    || !Number.isFinite(Date.parse(values.deadline)) || new Date(values.deadline).toISOString().slice(0, 10) !== values.deadline)) {
    errors.deadline = 'Informe uma data limite válida ou deixe o campo vazio.'
  }
  if ((!draft && !values.questions.length) || values.questions.length > 100) errors.questions = 'Adicione de 1 a 100 perguntas.'
  values.questions.forEach((question, index) => {
    const field = `questions.${index}`
    if ((!draft && !['nr', 'unit'].includes(question.kind) && !question.title) || question.title.length > 140) errors[field] = `Pergunta ${index + 1}: informe um texto de até 140 caracteres.`
    if (question.kind === 'option' && ((!draft && question.options.length < 2) || question.options.length > 100
      || question.options.filter(option => option.isOther).length > 1
      || question.options.some(option => (!draft && !option.isOther && !option.value) || option.value.length > 80))) errors[field] = `Pergunta ${index + 1}: preencha de 2 a 100 opções de até 80 caracteres e apenas uma opção Outros.`
    if (question.kind === 'photo' && (!Number.isInteger(question.maxFiles) || !question.maxFiles || question.maxFiles < 1 || question.maxFiles > 10
      || ![5, 10, 20, 50, 100].includes(question.maxFileSizeMb ?? 0))) errors[field] = `Pergunta ${index + 1}: informe limites válidos para as fotos.`
  })
  return { values, errors }
}
