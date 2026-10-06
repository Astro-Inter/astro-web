export interface AccountProfile {
  name: string
  email: string
  cpf: string
  units: string
  position: string
  modality: string
  photoUrl?: string
}

export const mockAccount: AccountProfile = {
  name: 'Kirk Hammett',
  email: 'kirk.hammett@astro.com.br',
  cpf: '123.456.789-00',
  units: 'Matriz, Campinas',
  position: 'Analista de dados',
  modality: 'Presencial',
}
