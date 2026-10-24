import { getForm, getFormRecipients } from './forms'
import { listUnits } from './units'
import type { FormReviewData } from '../types/formReview'

export async function getFormReview(id: string, signal?: AbortSignal): Promise<FormReviewData> {
  try {
    const [form, recipients, units] = await Promise.all([
      getForm(id, signal), getFormRecipients(signal).catch(() => null), listUnits(signal).catch(() => []),
    ])
    signal?.throwIfAborted()
    const currentManagerId = recipients?.currentManagerId ? Number(recipients.currentManagerId) : null
    const managerName = (managerId: number | null) => managerId !== null && managerId === currentManagerId ? 'Você'
      : recipients?.managers.find(manager => manager.value === String(managerId))?.label ?? (managerId ? `Gestor #${managerId}` : 'Não informado')
    return { form, currentManagerId, recipientName: managerName(form.managerId), senderName: managerName(form.senderManagerId),
      unitName: units.find(unit => unit.id === String(form.unitId))?.name ?? (form.unitId ? `Unidade #${form.unitId}` : 'Não informada'),
      review: { status: form.status === 'CONCLUIDO' ? 'awaiting_review' : 'awaiting_response' } }
  } catch (error: unknown) {
    if (signal?.aborted || error instanceof Error) throw error
    throw new Error('Não foi possível carregar as respostas do formulário.')
  }
}
