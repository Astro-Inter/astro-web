export function postalCodeFieldError(message: string): string {
  return message.startsWith('CEP não encontrado') ? 'CEP não encontrado.' : 'Não foi possível consultar o CEP.'
}
