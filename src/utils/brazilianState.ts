const brazilianStates = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))

export function isValidBrazilianState(value: string): boolean {
  return brazilianStates.has(value.trim().toUpperCase())
}
