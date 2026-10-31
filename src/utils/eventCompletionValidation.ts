/** Mantém os limites do contrato de conclusão, inclusive evidência opcional. */
export function validateEventCompletionFiles(files: readonly File[]): string | null {
  if (files.length > 3 || files.some(file => file.size > 50 * 1024 * 1024)) {
    return 'Envie até três arquivos de no máximo 50 MB cada.'
  }
  return null
}
