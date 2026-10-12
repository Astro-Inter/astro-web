export class ChatValidationError extends Error {}

export function validateChatMessage(value: string): string {
  const message = value.trim()
  if (!message || message.length > 10000) throw new ChatValidationError('Digite uma mensagem de até 10.000 caracteres.')
  return message
}

export function validateChatSessionId(value: string): string {
  if (!value.trim() || value.length > 200 || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new ChatValidationError('O identificador da conversa é inválido.')
  return value
}
