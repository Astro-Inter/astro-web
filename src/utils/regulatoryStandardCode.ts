export function normalizeRegulatoryStandardCode(code: string): string {
  return code.trim().replace(/^NR\s*(\d+)$/i, 'NR$1')
}

export function formatRegulatoryStandardCode(code: string): string {
  return normalizeRegulatoryStandardCode(code).replace(/^NR(\d+)$/, 'NR $1')
}
