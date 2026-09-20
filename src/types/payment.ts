export type PaymentMethod = 'card' | 'pix'

export interface PaymentFormState {
  email: string
  cardNumber: string
  expiry: string
  securityCode: string
  taxId: string
  fullName: string
}
