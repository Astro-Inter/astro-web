export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/[./\s-]/g, '')
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false
  function checkDigit(base: string): string {
    let weight = base.length - 7
    let sum = 0
    for (const digit of base) {
      sum += Number(digit) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    const remainder = sum % 11
    return String(remainder < 2 ? 0 : 11 - remainder)
  }
  const first = checkDigit(digits.slice(0, 12))
  const second = checkDigit(digits.slice(0, 12) + first)
  return digits.endsWith(first + second)
}
