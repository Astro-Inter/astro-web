export interface DownloadableSpreadsheetExample {
  columns: readonly { label: string }[]
  rows: readonly (readonly string[])[]
}

export async function createSpreadsheetExampleBlob(example: DownloadableSpreadsheetExample): Promise<Blob> {
  const { utils, write } = await import('xlsx')
  const columns = example.columns.flatMap((column, index) => column.label ? [index] : [])
  const data = [columns.map(index => example.columns[index].label),
    ...example.rows.map(row => columns.map(index => row[index] ?? ''))]
  const workbook = utils.book_new()
  const sheet = utils.aoa_to_sheet(data)
  sheet['!cols'] = columns.map(() => ({ wch: 24 }))
  utils.book_append_sheet(workbook, sheet, 'Modelo')
  return new Blob([write(workbook, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
