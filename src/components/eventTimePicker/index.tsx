import { BUTTONS } from '../../gtm/buttons'
import AstroIcon from '../astroIcon'
import ToolbarSelect from '../toolbarSelect'

interface EventTimePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

const timeOptions = [
  { value: '', label: 'Selecione o horário', tone: 'muted' as const },
  ...Array.from({ length: 96 }, (_, index) => {
    const time = `${String(Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`
    return { value: time, label: time }
  }),
]

function EventTimePicker({ id, label, value, onChange }: EventTimePickerProps) {
  const options = value && !timeOptions.some(option => option.value === value) ? [...timeOptions, { value, label: value }] : timeOptions
  return <div className="event-create-time-picker">
    <ToolbarSelect trackingAction={label === 'Entrada' ? BUTTONS.comuns.horario_entrada : label === 'Saída' ? BUTTONS.comuns.horario_saida : BUTTONS.comuns.selecionar_horario} escapeOverflow id={id} label={label} maxVisibleRows={3} onValueChange={onChange} options={options} preferredPlacement="below" value={value} />
    <AstroIcon className="event-create-time-icon" name="clock" />
  </div>
}

export default EventTimePicker
