import type { EventDraft } from '../types/eventCreation'

export type EventInformationErrors = Partial<Record<'title' | 'description' | 'externalLink', string>>

export function validateEventInformation(draft: EventDraft): EventInformationErrors {
  const errors: EventInformationErrors = {}
  const title = draft.title.trim()
  if (title.length < 3 || title.length > 255) errors.title = 'Informe um título de 3 a 255 caracteres.'
  if (draft.description.trim().length < 3) errors.description = 'Informe uma descrição com pelo menos 3 caracteres.'
  else if (draft.description.trim().length > 5000) errors.description = 'A descrição deve ter até 5000 caracteres.'
  const link = draft.externalLink.trim()
  if (link) {
    let valid = /^https?:\/\/\S+$/i.test(link) && link.length <= 2048
    try {
      const url = new URL(link)
      valid = valid && !!url.hostname
    } catch {
      valid = false
    }
    if (!valid) errors.externalLink = 'Informe um link HTTP(S) válido de até 2048 caracteres.'
  }
  return errors
}
