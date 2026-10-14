export class ManagerEmailMissingError extends Error {
  constructor() {
    super('O e-mail do gestor não está na planilha.')
    this.name = 'ManagerEmailMissingError'
  }
}
