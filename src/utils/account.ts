export function validateAccountPhoto(file: File | null): string {
  if (!file || file.size === 0) return 'Selecione uma imagem que não esteja vazia.'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Selecione uma imagem JPEG, PNG ou WebP.'
  if (file.size > 5 * 1024 * 1024) return 'A foto deve ter no máximo 5 MB.'
  return ''
}
