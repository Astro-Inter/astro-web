type AstroIconName =
  | 'back'
  | 'building'
  | 'card'
  | 'calendar'
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
  | 'close'
  | 'dots'

// Os arquivos têm proporções e espaços internos diferentes. O CSS define a
// altura visual de cada uso; width: auto conserva a proporção original.
const iconFiles: Record<AstroIconName, { file: string; width: number; height: number }> = {
  back: { file: 'back-button.svg', width: 71, height: 71 },
  building: { file: 'building.svg', width: 31, height: 28 },
  card: { file: 'card.svg', width: 32, height: 31 },
  calendar: { file: 'calendar.svg', width: 27, height: 27 },
  document: { file: 'paper3.svg', width: 27, height: 33 },
  download: { file: 'download.svg', width: 19, height: 21 },
  expiry: { file: 'time.svg', width: 21, height: 23 },
  eye: { file: 'eye.svg', width: 29, height: 24 },
  'eye-off': { file: 'eye-off.svg', width: 29, height: 29 },
  forward: { file: 'back-button.svg', width: 71, height: 71 },
  help: { file: 'help.svg', width: 26, height: 26 },
  active: { file: 'person.svg', width: 28, height: 27 },
  mapping: { file: 'paper1.svg', width: 21, height: 26 },
  pix: { file: 'pix.svg', width: 27, height: 27 },
  plus: { file: 'add-purple.svg', width: 25, height: 25 },
  receipt: { file: 'paper2.svg', width: 26, height: 28 },
  report: { file: 'paper3.svg', width: 27, height: 33 },
  security: { file: 'wallet.svg', width: 29, height: 24 },
  trash: { file: 'trash.svg', width: 20, height: 22 },
  upload: { file: 'upload.svg', width: 24, height: 26 },
  home: { file: 'home.svg', width: 27, height: 27 },
  managers: { file: 'managers.svg', width: 27, height: 27 },
  // O arquivo foi substituído mantendo o nome; a revisão invalida o cache anterior.
  collaborators: { file: 'collaborators.svg?v=2', width: 29, height: 24 },
  compliance: { file: 'compliance.svg?v=2', width: 27, height: 27 },
  position: { file: 'positions.svg', width: 27, height: 27 },
  'event-calendar': { file: 'calendar2.svg', width: 27, height: 27 },
  settings: { file: 'settings.svg', width: 27, height: 29 },
  search: { file: 'search.svg', width: 25, height: 25 },
  'chevron-down': { file: 'chevron-down.svg', width: 22, height: 13 },
  close: { file: 'across.svg', width: 21, height: 21 },
  dots: { file: 'dots.svg', width: 21, height: 5 },
}

interface AstroIconProps {
  className?: string
  name: AstroIconName
  strokeScale?: 0.9
}

function AstroIcon({ className, name, strokeScale }: AstroIconProps) {
  const icon = iconFiles[name]
  const iconDirectory = strokeScale === 0.9 ? '/icon/stroke-90' : '/icon'

  return (
    <img
      alt=""
      aria-hidden="true"
      className={`astro-icon astro-icon--${name}${className ? ` ${className}` : ''}`}
      height={icon.height}
      src={`${iconDirectory}/${icon.file}`}
      width={icon.width}
    />
  )
}

export default AstroIcon
