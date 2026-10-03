import AstroIcon from '../AstroIcon'
import ToolbarSelect from '../ToolbarSelect'

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
  return <div className="event-create-time-picker">
    <ToolbarSelect id={id} label={label} maxVisibleRows={3} onValueChange={onChange} options={timeOptions} preferredPlacement="below" value={value} />
    <AstroIcon className="event-create-time-icon" name="expiry" />
  </div>
}

export default EventTimePicker
