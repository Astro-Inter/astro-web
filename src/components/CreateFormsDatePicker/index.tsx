import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import AstroIcon from '../AstroIcon'

interface CreateFormsDatePickerProps {
  id: string
  label: string
  onChange: (value: string) => void
  onValidityChange?: (valid: boolean) => void
  value: string
  validate?: boolean
}

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText), 12)
  if (date.getFullYear() !== Number(yearText) || date.getMonth() !== Number(monthText) - 1 || date.getDate() !== Number(dayText)) return null
  return date
}

function parseDisplayDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, dayText, monthText, yearText] = match
  return parseIsoDate(`${yearText}-${monthText}-${dayText}`)
}

function formatInputDate(value: string) {
  const date = parseIsoDate(value)
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : ''
}

function formatMonthTitle(date: Date) {
  const title = monthFormatter.format(date)
  return `${title.charAt(0).toLocaleUpperCase('pt-BR')}${title.slice(1)}`
}

function formatDateDigits(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12)
}

function sameDate(first: Date | null, second: Date) {
  return first !== null && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}

function CreateFormsDatePicker({ id, label, onChange, onValidityChange, value, validate = true }: CreateFormsDatePickerProps) {
  const generatedId = useId()
  const calendarId = `${generatedId}-calendar`
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingFocusDate = useRef<string | null>(null)
  const selectedDate = parseIsoDate(value)
  const [inputDraft, setInputDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'above' | 'below'>('below')
  const [monthTransitionDirection, setMonthTransitionDirection] = useState<'next' | 'previous'>('next')
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()))
  const { closing, requestClose } = useAnimatedClose()
  const inputValue = inputDraft ?? formatInputDate(value)
  const invalidInput = inputValue !== '' && parseDisplayDate(inputValue) === null
  const [touched, setTouched] = useState(false)
  const showError = validate && invalidInput && (touched || inputValue.length === 10)

  const closeCalendar = useCallback((onFinished?: () => void, restoreFocus = false) => {
    requestClose(() => {
      setOpen(false)
      onFinished?.()
      if (restoreFocus) inputRef.current?.focus()
    })
  }, [requestClose])

  useLayoutEffect(() => {
    if (!open || closing) return
    const calendarBounds = calendarRef.current?.getBoundingClientRect()
    const inputBounds = inputRef.current?.getBoundingClientRect()
    if (!calendarBounds || !inputBounds) return
    const availableBelow = window.innerHeight - inputBounds.bottom - 20
    const availableAbove = inputBounds.top - 20
    setPlacement(calendarBounds.height > availableBelow && availableAbove > availableBelow ? 'above' : 'below')
    if (pendingFocusDate.current) {
      calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocusDate.current}"]`)?.focus({ preventScroll: true })
      pendingFocusDate.current = null
    }
  }, [closing, open, visibleMonth])

  useEffect(() => {
    if (!open) return

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeCalendar()
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeCalendar(undefined, true)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeCalendar, open])

  function openCalendar(focusDay = false) {
    if (closing) return
    const dateToShow = parseDisplayDate(inputValue) ?? selectedDate ?? new Date()
    if (focusDay) pendingFocusDate.current = toIsoDate(dateToShow)
    setVisibleMonth(startOfMonth(dateToShow))
    setOpen(true)
  }

  function updateInput(nextValue: string) {
    const formattedValue = formatDateDigits(nextValue)
    setInputDraft(formattedValue)
    const parsedDate = parseDisplayDate(formattedValue)
    onChange(parsedDate ? toIsoDate(parsedDate) : '')
    onValidityChange?.(formattedValue === '' || parsedDate !== null)
    if (parsedDate) {
      setInputDraft(null)
      setVisibleMonth(startOfMonth(parsedDate))
    }
  }

  function chooseDate(date: Date) {
    const isoDate = toIsoDate(date)
    setInputDraft(null)
    onChange(isoDate)
    onValidityChange?.(true)
    closeCalendar(undefined, true)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault()
      openCalendar(true)
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      closeCalendar(undefined, true)
    }
  }

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const firstWeekday = (new Date(year, month, 1, 12).getDay() + 6) % 7
  const numberOfDays = new Date(year, month + 1, 0, 12).getDate()
  const today = new Date()
  const days = Array.from({ length: numberOfDays }, (_, index) => new Date(year, month, index + 1, 12))

  function changeMonth(offset: number) {
    setMonthTransitionDirection(offset < 0 ? 'previous' : 'next')
    setVisibleMonth(new Date(year, month + offset, 1, 12))
  }

  function moveDayWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const next = new Date(date)
    if (event.key in offsets) next.setDate(next.getDate() + offsets[event.key])
    else if (event.key === 'Home') next.setDate(next.getDate() - (next.getDay() + 6) % 7)
    else if (event.key === 'End') next.setDate(next.getDate() + 6 - (next.getDay() + 6) % 7)
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const offset = event.key === 'PageUp' ? -1 : 1
      next.setDate(1)
      next.setMonth(next.getMonth() + offset)
      next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
    } else return
    event.preventDefault()
    const button = calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(next)}"]`)
    if (button) button.focus({ preventScroll: true })
    else {
      pendingFocusDate.current = toIsoDate(next)
      setVisibleMonth(startOfMonth(next))
    }
  }

  return (
    <div className="create-forms-date-picker" data-placement={placement} ref={containerRef}>
      <div className="create-forms-date-control">
        <input
          aria-describedby={showError ? `${id}-error` : undefined}
          aria-invalid={showError}
          aria-controls={calendarId}
          aria-expanded={open && !closing}
          aria-haspopup="dialog"
          autoComplete="off"
          id={id}
          inputMode="numeric"
          onChange={(event) => updateInput(event.target.value)}
          onBlur={() => setTouched(true)}
          onClick={() => openCalendar()}
          onKeyDown={handleInputKeyDown}
          placeholder="dd/mm/aaaa"
          ref={inputRef}
          type="text"
          value={inputValue}
        />
        <button
          aria-controls={calendarId}
          aria-expanded={open && !closing}
          aria-label={open && !closing ? 'Fechar calendário' : `Abrir calendário de ${label.toLocaleLowerCase('pt-BR')}`}
          className="create-forms-date-trigger"
          onClick={() => open ? closeCalendar(undefined, true) : openCalendar(true)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          <AstroIcon name="calendar" />
        </button>
      </div>
      {showError && <p className="create-forms-date-error" id={`${id}-error`} role="alert">Informe uma data válida no formato dd/mm/aaaa.</p>}

      {open && <div aria-label={`Calendário: ${label}`} className={`create-forms-calendar${closing ? ' create-forms-calendar--closing' : ''}`} id={calendarId} ref={calendarRef} role="dialog">
        <div className="create-forms-calendar-header">
          <button aria-label="Mês anterior" onClick={() => changeMonth(-1)} type="button"><span aria-hidden="true">‹</span></button>
          <h3 aria-live="polite" key={`${year}-${month}`}>{formatMonthTitle(visibleMonth)}</h3>
          <button aria-label="Próximo mês" onClick={() => changeMonth(1)} type="button"><span aria-hidden="true">›</span></button>
        </div>

        <div aria-hidden="true" className="create-forms-calendar-weekdays">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        <div aria-label={formatMonthTitle(visibleMonth)} className={`create-forms-calendar-days create-forms-calendar-days--${monthTransitionDirection}`} key={`${year}-${month}`}>
          {Array.from({ length: firstWeekday }, (_, index) => <span aria-hidden="true" className="create-forms-calendar-empty" key={`empty-${year}-${month}-${index}`} />)}
          {days.map((date) => {
            const isSelected = sameDate(selectedDate, date)
            const isToday = sameDate(today, date)
            return <button
              aria-current={isToday ? 'date' : undefined}
              aria-label={dateFormatter.format(date)}
              aria-pressed={isSelected}
              className={`create-forms-calendar-day${isSelected ? ' create-forms-calendar-day--selected' : ''}${isToday ? ' create-forms-calendar-day--today' : ''}`}
              key={date.getDate()}
              data-date={toIsoDate(date)}
              onClick={() => chooseDate(date)}
              onKeyDown={(event) => moveDayWithKeyboard(event, date)}
              type="button"
            >{date.getDate()}</button>
          })}
        </div>

        <div className="create-forms-calendar-footer">
          <span>{selectedDate ? dateFormatter.format(selectedDate) : 'Selecione uma data'}</span>
          <button onClick={() => chooseDate(new Date())} type="button">Hoje</button>
        </div>
      </div>}
    </div>
  )
}

export default CreateFormsDatePicker
