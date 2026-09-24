const MAX_SPREADSHEET_SIZE = 10 * 1024 * 1024

export type SpreadsheetFileValidation =
  | { valid: true; file: File }
  | { valid: false; message: string }

export function validateSpreadsheetFile(file: File): SpreadsheetFileValidation {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return { valid: false, message: 'Selecione uma planilha .xlsx ou .xls.' }
  }

  if (file.size > MAX_SPREADSHEET_SIZE) {
    return { valid: false, message: 'A planilha deve ter no máximo 10 MB.' }
  }

  return { valid: true, file }
}
