import { read, utils } from 'xlsx'
import { normalizeUnitName } from './workspaceUnits'

export function extractSpreadsheetUnitNames(data: ArrayBuffer, managerEmail: string): string[] {
  const bytes = new Uint8Array(data)
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  const isOle = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => bytes[index] === byte)
  if (!isZip && !isOle) throw new Error('Não foi possível ler o arquivo. Envie uma planilha Excel XLS ou XLSX válida.')

  let rows: string[][]
  let firstRow: number
  try {
    const workbook = read(data, { type: 'array', sheets: 0, cellHTML: false, cellFormula: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet?.['!ref']) throw new Error('Planilha vazia')
    firstRow = utils.decode_range(sheet['!ref']).s.r
    rows = utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true })
  } catch {
    throw new Error('Não foi possível ler a primeira aba. Confira o arquivo Excel e tente novamente.')
  }

  const headerIndex = rows.findIndex(row => row.some(value => String(value).trim()))
  if (headerIndex < 0) throw new Error('A primeira aba está vazia. Inclua os cabeçalhos e os dados do gestor.')
  rows = rows.slice(headerIndex)
  firstRow += headerIndex
  const columns = rows[0]?.map(value => normalizeUnitName(String(value))) ?? []
  const unitColumns = columns.flatMap((column, index) => column === 'unidade' ? [index] : [])
  if (unitColumns.length !== 1) throw new Error('A primeira aba deve conter uma única coluna chamada "unidade".')
  const requiredColumns = new Map<string, number>()
  for (const field of ['nome', 'cpf', 'email', 'unidade', 'cargo', 'modalidade']) {
    const matches = columns.flatMap((column, index) => column === field ? [index] : [])
    if (matches.length !== 1) throw new Error(`A primeira aba deve conter uma única coluna chamada "${field}".`)
    requiredColumns.set(field, matches[0])
  }
  const normalizedEmail = managerEmail.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Informe o e-mail do gestor no cadastro antes de validar a planilha.')
  const emailColumn = requiredColumns.get('email')!
  const managerRows = rows.slice(1).flatMap((row, index) =>
    String(row[emailColumn] ?? '').trim().toLowerCase() === normalizedEmail ? [{ row, number: firstRow + index + 2 }] : [])
  if (!managerRows.length) {
    throw new Error(`Inclua na primeira aba uma linha com o e-mail do gestor ${managerEmail.trim()}, informado no cadastro.`)
  }
  if (managerRows.length > 1) {
    throw new Error(`O e-mail do gestor aparece mais de uma vez (linhas ${managerRows.map(entry => entry.number).join(', ')}). Mantenha exatamente uma linha para ele na primeira aba.`)
  }
  const manager = managerRows[0]
  for (const field of ['nome', 'cargo']) {
    if (!String(manager.row[requiredColumns.get(field)!] ?? '').trim()) {
      throw new Error(`Linha ${manager.number}: preencha o ${field} do gestor na planilha.`)
    }
  }
  const names = new Map<string, string>()
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every(value => !String(value).trim())) continue
    const name = String(row[unitColumns[0]] ?? '').trim()
    const rowNumber = firstRow + index + 2
    if (name.length < 2 || name.length > 80) {
      throw new Error(`Linha ${rowNumber}: preencha a unidade com um nome de 2 a 80 caracteres na planilha.`)
    }
    const key = normalizeUnitName(name)
    if (!names.has(key)) names.set(key, name)
  }
  if (!names.size) throw new Error('A primeira aba não contém unidades para cadastrar. Confira a coluna "unidade".')
  return [...names.values()]
}
