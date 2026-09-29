import type { CreateFormValues, FormQuestion, FormQuestionKind } from '../types/forms'

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
  if (!values.name.trim()) return 'Digite o nome do formulário.'
  if (!values.manager) return 'Selecione um gestor.'
  if (!deadlineValid) return 'Informe uma data limite válida ou deixe o campo vazio.'
  if (values.questions.length === 0) return 'Adicione pelo menos uma pergunta.'
  for (const [index, question] of values.questions.entries()) {
    if (!['nr', 'unit'].includes(question.kind) && !question.title.trim()) return 'Preencha o texto de todas as perguntas.'
    if (question.kind === 'option' && (question.options.length < 2 || question.options.some((option) => !option.isOther && !option.value.trim()))) {
      return `Preencha as opções da pergunta ${index + 1}.`
    }
  }
  return null
}
