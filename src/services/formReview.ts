import { FormsApiError, parseFormDetails, requestForms } from './forms'
import { isFormId } from '../utils/formApi'
import { rejectionDescriptionError, safeResponseFileUrl } from '../utils/formReview'
import type { FormDetailsResponse } from '../types/forms'
import type { FormImageDownload, FormReviewData, FormReviewState } from '../types/formReview'

function responsePath(id: string): string {
  if (!isFormId(id)) throw new FormsApiError('Identificador do formulário inválido.')
  return `/forms/${id}`
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function parseReview(value: unknown, id: string): FormReviewData {
  const data = record(value), review = record(data?.review)
  if (!data || !record(data.form) || !review || typeof data.canReview !== 'boolean'
    || [data.senderName, data.recipientName, data.unitName].some(name => typeof name !== 'string')) {
    throw new FormsApiError('A API retornou uma análise de formulário inválida.')
  }
  const form = parseFormDetails(data.form as FormDetailsResponse)
  if (form.id !== id) throw new FormsApiError('A resposta não corresponde ao formulário selecionado.')
  let state: FormReviewState
  if (review.status === 'awaiting_response' || review.status === 'awaiting_review') {
    state = { status: review.status }
  } else if ((review.status === 'approved' || review.status === 'rejected') && typeof review.reviewedAt === 'string'
    && Number.isFinite(Date.parse(review.reviewedAt)) && (review.reviewerName === null || typeof review.reviewerName === 'string')) {
    const metadata = { reviewerName: typeof review.reviewerName === 'string' && review.reviewerName.trim() ? review.reviewerName : 'Não informado', reviewedAt: review.reviewedAt }
    if (review.status === 'approved') state = { status: 'approved', ...metadata }
    else {
      if (typeof review.description !== 'string' || rejectionDescriptionError(review.description)) throw new FormsApiError('A API retornou uma descrição de reprovação inválida.')
      state = { status: 'rejected', ...metadata, description: review.description }
    }
  } else throw new FormsApiError('A API retornou um resultado de análise inválido.')
  return { form, currentManagerId: null, canReview: data.canReview, senderName: data.senderName as string,
    recipientName: data.recipientName as string, unitName: data.unitName as string, review: state }
}
export async function getFormReview(id: string, signal?: AbortSignal): Promise<FormReviewData> {
  try {
    const data = await requestForms<unknown>(`${responsePath(id)}/responses`, 'GET', undefined, signal)
    return parseReview(data, id)
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof Error) throw error
    throw new FormsApiError('Não foi possível carregar as respostas do formulário.')
  }
}
export async function submitFormReview(id: string, status: 'approved' | 'rejected', description = '', signal?: AbortSignal): Promise<FormReviewData> {
  try {
    const path = `${responsePath(id)}/review`
    if (status !== 'approved' && status !== 'rejected') throw new FormsApiError('Selecione uma decisão válida.')
    const error = status === 'rejected' ? rejectionDescriptionError(description) : ''
    if (error) throw new FormsApiError(error)
    const payload = status === 'approved' ? { status } : { status, description: description.trim() }
    const data = parseReview(await requestForms<unknown>(path, 'POST', payload, signal), id)
    if (data.review.status !== status) throw new FormsApiError('A API não confirmou a decisão solicitada. Consulte novamente o formulário.')
    return data
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof Error) throw error
    throw new FormsApiError('Não foi possível registrar a análise do formulário.')
  }
}
export async function getFormResponseImage(id: string, imageId: string, signal?: AbortSignal): Promise<FormImageDownload> {
  try {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(imageId)) throw new FormsApiError('Identificador de imagem inválido.')
    const data = record(await requestForms<unknown>(`${responsePath(id)}/images/${encodeURIComponent(imageId)}`, 'GET', undefined, signal))
    const url = safeResponseFileUrl(data?.url)
    if (!data || data.id !== imageId || !url || typeof data.expiresAt !== 'string'
      || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) {
      throw new FormsApiError('A API retornou uma imagem indisponível ou expirada. Tente novamente.')
    }
    return { id: imageId, url, expiresAt: data.expiresAt }
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof Error) throw error
    throw new FormsApiError('Não foi possível abrir a imagem do formulário.')
  }
}
