import { dashboardArtworks, isDashboardArtwork } from '../data/dashboardArtwork'
import { formCardColors, formCardIcons, isFormCardAppearance } from '../data/formCardAppearance'
import type { DashboardArtworkId } from '../types/dashboard'
import type { FormCardAppearance } from '../types/forms'

const suffix = /\s*\[ac(\d+):([fd]):([^\]\r\n]{0,80})\]\s*$/
function splitTitle(value: string) {
  let title = value.trim()
  const match = title.match(suffix)
  while (suffix.test(title)) title = title.replace(suffix, '').trimEnd()
  return { title, version: match?.[1], kind: match?.[2], code: match?.[3], marked: !!match }
}
export function decodeFormCardTitle(value: string | null) {
  const parts = splitTitle(value ?? '')
  const match = parts.code?.match(/^(\d):(\d)$/)
  const icon = match ? formCardIcons[Number(match[1])]?.value : undefined
  const color = match ? formCardColors[Number(match[2])]?.value : undefined
  const appearance = parts.version === '1' && parts.kind === 'f' && icon && color ? { icon, color } : undefined
  return { title: parts.title, appearance }
}
export function encodeFormCardTitle(title: string, appearance?: FormCardAppearance): string {
  const clean = splitTitle(title).title
  if (!appearance) return clean
  if (!isFormCardAppearance(appearance)) throw new Error('Escolha um ícone e uma cor válidos.')
  return `${clean} [ac1:f:${formCardIcons.findIndex(option => option.value === appearance.icon)}:${formCardColors.findIndex(option => option.value === appearance.color)}]`
}
export function formCardTitleLimit(appearance?: FormCardAppearance) {
  return 100 - encodeFormCardTitle('', appearance).length
}
export function decodeDashboardCardTitle(value: string) {
  const parts = splitTitle(value)
  const match = parts.code?.match(/^\d$/)
  const artwork = parts.version === '1' && parts.kind === 'd' && match ? dashboardArtworks[Number(parts.code)]?.id : undefined
  return { name: parts.title, artwork, marked: parts.marked }
}
export function encodeDashboardCardTitle(name: string, artwork: DashboardArtworkId): string {
  if (!isDashboardArtwork(artwork)) throw new Error('Escolha uma ilustração válida.')
  return `${splitTitle(name).title} [ac1:d:${dashboardArtworks.findIndex(option => option.id === artwork)}]`
}
