import { dashboardArtworks } from '../data/dashboardArtwork'

const suffix = /\s*\[ac(\d+):([fd]):([^\]\r\n]{0,80})\]\s*$/
function splitTitle(value: string) {
  let title = value.trim()
  const match = title.match(suffix)
  while (suffix.test(title)) title = title.replace(suffix, '').trimEnd()
  return { title, version: match?.[1], kind: match?.[2], code: match?.[3], marked: !!match }
}
export function decodeDashboardCardTitle(value: string) {
  const parts = splitTitle(value)
  const match = parts.code?.match(/^\d$/)
  const artwork = parts.version === '1' && parts.kind === 'd' && match ? dashboardArtworks[Number(parts.code)]?.id : undefined
  return { name: parts.title, artwork, marked: parts.marked }
}
