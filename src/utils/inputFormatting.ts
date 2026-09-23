import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { formatCnpj } from './cnpj'

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function sanitizeEmail(value: string): string {
  return value.replace(/\s/g, '').slice(0, 254)
}

export function blockEmailWhitespaceKey(event: KeyboardEvent<HTMLInputElement>): void {
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && /\s/.test(event.key)) {
    event.preventDefault()
  }
}

export function blockEmailWhitespaceInput(event: FormEvent<HTMLInputElement>): void {
  const inputEvent = event.nativeEvent as InputEvent
  if (inputEvent.inputType !== 'insertFromPaste' && inputEvent.data && /\s/.test(inputEvent.data)) {
    event.preventDefault()
  }
}

export function formatCpfCnpj(value: string): string {
  const digits = digitsOnly(value, 14)

  if (digits.length > 11) return formatCnpj(digits)

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function formatCep(value: string): string {
  const digits = digitsOnly(value, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export function formatCardNumber(value: string): string {
  return digitsOnly(value, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function formatCardExpiry(value: string): string {
  const digits = digitsOnly(value, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits
}

export function formatState(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
}

function caretAfterDigits(value: string, digitCount: number): number {
  if (digitCount === 0) return 0

  let seen = 0
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index]) && ++seen === digitCount) return index + 1
  }
  return value.length
}

export function handleMaskedInput(
  event: ChangeEvent<HTMLInputElement>,
  format: (value: string) => string,
  onChange: (value: string) => void,
): void {
  const input = event.currentTarget
  const digitCount = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length
  const formatted = format(input.value)
  onChange(formatted)

  requestAnimationFrame(() => {
    if (input.isConnected && document.activeElement === input) {
      const caret = caretAfterDigits(formatted, digitCount)
      input.setSelectionRange(caret, caret)
    }
  })
}
