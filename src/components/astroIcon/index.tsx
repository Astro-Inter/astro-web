import { iconAsset } from '../../utils/iconAsset'
type AstroIconName =
  | 'back'
  | 'building'
  | 'card'
  | 'calendar'
  | 'clock'
  | 'document'
  | 'download'
  | 'expiry'
  | 'eye'
  | 'eye-off'
  | 'forward'
  | 'help'
  | 'active'
  | 'mapping'
  | 'pix'
  | 'plus'
  | 'plus-square'
  | 'receipt'
  | 'report'
  | 'security'
  | 'trash'
  | 'upload'
  | 'home'
  | 'managers'
  | 'collaborators'
  | 'compliance'
  | 'position'
  | 'event-calendar'
  | 'settings'
  | 'search'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'dots'
  | 'pencil'
  | 'person-outline'
  | 'feedback'
  | 'file-plus'
  | 'warning'
  | 'distribution'
  | 'reload'
  | 'bell'
  | 'person-plus'
  | 'document-lines'
  | 'warning-circle'

// Todos os desenhos usam uma grade 24 × 24 com área visível centralizada.
// O CSS aplica o tamanho do contexto; o SVG mantém a espessura proporcional.
const iconFiles: Record<AstroIconName, { file: string; width: number; height: number }> = {
  back: { file: 'backButton.svg', width: 24, height: 24 },
  building: { file: 'building.svg', width: 24, height: 24 },
  card: { file: 'card.svg', width: 24, height: 24 },
  calendar: { file: 'calendar.svg', width: 24, height: 24 },
  clock: { file: 'clock.svg', width: 24, height: 24 },
  document: { file: 'report.svg', width: 24, height: 24 },
  download: { file: 'download.svg', width: 24, height: 24 },
  expiry: { file: 'time.svg', width: 24, height: 24 },
  eye: { file: 'eye.svg', width: 24, height: 24 },
  'eye-off': { file: 'eyeOff.svg', width: 24, height: 24 },
  forward: { file: 'backButton.svg', width: 24, height: 24 },
  help: { file: 'help.svg', width: 24, height: 24 },
  active: { file: 'person.svg', width: 24, height: 24 },
  mapping: { file: 'mappingDocument.svg', width: 24, height: 24 },
  pix: { file: 'pix.svg', width: 24, height: 24 },
  plus: { file: 'addPurple.svg', width: 24, height: 24 },
  'plus-square': { file: 'plus.svg', width: 24, height: 24 },
  receipt: { file: 'receipt.svg', width: 24, height: 24 },
  report: { file: 'report.svg', width: 24, height: 24 },
  security: { file: 'wallet.svg', width: 24, height: 24 },
  trash: { file: 'trash.svg', width: 24, height: 24 },
  upload: { file: 'upload.svg', width: 24, height: 24 },
  home: { file: 'home.svg', width: 24, height: 24 },
  managers: { file: 'managers.svg', width: 24, height: 24 },
  collaborators: { file: 'collaborators.svg', width: 24, height: 24 },
  compliance: { file: 'compliance.svg', width: 24, height: 24 },
  position: { file: 'positions.svg', width: 24, height: 24 },
  'event-calendar': { file: 'eventCalendar.svg', width: 24, height: 24 },
  settings: { file: 'settings.svg', width: 24, height: 24 },
  search: { file: 'search.svg', width: 24, height: 24 },
  'chevron-down': { file: 'chevronDown.svg', width: 24, height: 24 },
  'chevron-left': { file: 'chevronLeft.svg', width: 24, height: 24 },
  'chevron-right': { file: 'chevronRight.svg', width: 24, height: 24 },
  close: { file: 'close.svg', width: 24, height: 24 },
  dots: { file: 'dots.svg', width: 24, height: 24 },
  pencil: { file: 'pencil.svg', width: 24, height: 24 },
  'person-outline': { file: 'personOutline.svg', width: 24, height: 24 },
  feedback: { file: 'feedback.svg', width: 24, height: 24 },
  'file-plus': { file: 'addFile.svg', width: 24, height: 24 },
  warning: { file: 'warning.svg', width: 24, height: 24 },
  distribution: { file: 'distribution.svg', width: 24, height: 24 },
  bell: { file: 'bell.svg', width: 38, height: 42 },
  'person-plus': { file: 'personPlus.svg', width: 36, height: 35 },
  'document-lines': { file: 'documentLines.svg', width: 35, height: 35 },
  'warning-circle': { file: 'warningCircle.svg', width: 35, height: 35 },
  reload: { file: 'reload.svg', width: 24, height: 24 },
}

interface AstroIconProps {
  className?: string
  name: AstroIconName
  strokeScale?: 0.9 | 1
}

function AstroIcon({ className, name, strokeScale }: AstroIconProps) {
  const icon = iconFiles[name]
  const iconClassName = `astro-icon astro-icon--${name}${className ? ` ${className}` : ''}`

  if (name === 'plus-square') {
    return <span aria-hidden="true" className={iconClassName} />
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={iconClassName}
      height={icon.height}
      src={iconAsset(icon.file, strokeScale)}
      width={icon.width}
    />
  )
}

export default AstroIcon
