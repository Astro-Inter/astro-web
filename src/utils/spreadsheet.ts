import type { RegistrationSpreadsheetAnalysis } from '../types/workspaceRegistration'

const MAX_SPREADSHEET_SIZE = 10 * 1024 * 1024

export type SpreadsheetFileValidation =
  | { valid: true; file: File }
  | { valid: false; message: string }

export function validateSpreadsheetFile(file: File, maxSize = MAX_SPREADSHEET_SIZE): SpreadsheetFileValidation {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return { valid: false, message: 'Selecione uma planilha .xlsx ou .xls.' }
  }

  if (file.size === 0) {
    return { valid: false, message: 'A planilha não pode estar vazia.' }
  }

  if (file.size > maxSize) {
    return { valid: false, message: `A planilha deve ter no máximo ${maxSize / (1024 * 1024)} MB.` }
  }

  return { valid: true, file }
}

export async function readSpreadsheetUnitNames(file: File, managerEmail: string): Promise<string[]> {
  return (await readRegistrationSpreadsheet(file, managerEmail)).names
}

export async function readRegistrationSpreadsheet(file: File, managerEmail: string): Promise<RegistrationSpreadsheetAnalysis> {
  const validation = validateSpreadsheetFile(file, 5 * 1024 * 1024)
  if (!validation.valid) throw new Error(validation.message)
  const { extractRegistrationSpreadsheet } = await import('./excelUnits')
  return extractRegistrationSpreadsheet(await file.arrayBuffer(), managerEmail)
}

export async function readImportSpreadsheetUnitNames(file: File): Promise<string[]> {
  const validation = validateSpreadsheetFile(file)
  if (!validation.valid) throw new Error(validation.message)
  const { extractSpreadsheetUnitNames } = await import('./excelUnits')
  return extractSpreadsheetUnitNames(await file.arrayBuffer(), '', true)
}
