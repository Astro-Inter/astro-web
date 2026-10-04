// Atualize a revisão quando os desenhos mudarem para renovar todos os usos.
const iconRevision = 'weightMinus8WarningBold'

export function iconAsset(file: string, strokeScale: 0.9 | 1 = 1) {
  const directory = strokeScale === 0.9 ? 'icons/stroke90' : 'icons'
  return `${import.meta.env.BASE_URL}${directory}/${file}?v=${iconRevision}`
}
