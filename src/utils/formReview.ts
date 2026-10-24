import type { FormQuestionResponse } from '../types/forms'
import type { FormResponseFile, FormReviewData, FormReviewDecision, FormReviewState } from '../types/formReview'
import type { WebAccountType } from '../types/authentication'

export const reviewStatusLabels = {
  awaiting_response: 'Aguardando resposta', awaiting_review: 'Aguardando análise', approved: 'Aprovado', rejected: 'Reprovado',
}
export const rejectionDescriptionLimit = 1000
export function rejectionDescriptionError(description: string): string {
  if (!description.trim()) return 'Descreva o motivo da reprovação.'
  if (description.trim().length > rejectionDescriptionLimit) return `Use no máximo ${rejectionDescriptionLimit} caracteres.`
  return ''
}
export function createReviewDecision(status: 'approved' | 'rejected', reviewerName: string, description = '', reviewedAt = new Date().toISOString()): FormReviewDecision {
  if (status === 'approved') return { status, reviewerName, reviewedAt }
  const error = rejectionDescriptionError(description)
  if (error) throw new Error(error)
  return { status, reviewerName, reviewedAt, description: description.trim() }
}
export function canReviewForm(data: FormReviewData, accountType: WebAccountType | null | undefined): boolean {
  return data.form.status === 'CONCLUIDO' && data.review.status === 'awaiting_review'
    && data.currentManagerId !== null
    && (accountType === 'GESTOR_WORKSPACE' || (accountType === 'GESTOR' && data.currentManagerId === data.form.senderManagerId))
}
export function reviewIsFinal(review: FormReviewState): boolean { return review.status === 'approved' || review.status === 'rejected' }
export function formatResponseDate(value: string | null, includeTime = false): string {
  if (!value) return 'Não informado'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value)
  if (!Number.isFinite(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value)) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(date)
}
export function answerText(question: FormQuestionResponse): string[] {
  return question.answer.flatMap(value => typeof value === 'string' && value.trim() ? [value] : typeof value === 'number' && Number.isFinite(value) ? [String(value)] : [])
}
export function selectedOptionIds(question: FormQuestionResponse): number[] {
  return (question.options ?? []).filter(option => question.answer.some(answer => answer === option.id || answer === String(option.id) || answer === option.text)).map(option => option.id)
}
export function safeResponseFileUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
export function responseFiles(question: FormQuestionResponse): FormResponseFile[] {
  return question.answer.flatMap((value, index) => {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : null
    const url = safeResponseFileUrl(item?.url ?? value)
    if (!url && !item) return []
    return [{ id: `${question.id}-${index}-${url ?? 'file'}`, name: typeof item?.name === 'string' && item.name.trim() ? item.name : `Foto ${index + 1}`, url }]
  })
}
export function answeredQuestionCount(questions: FormQuestionResponse[]): number {
  return questions.filter(question => question.answer.length > 0).length
}
