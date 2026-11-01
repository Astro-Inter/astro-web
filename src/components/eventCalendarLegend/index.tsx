function EventCalendarLegend() {
  return <section className="event-calendar-legend" aria-label="Legenda das cores do calendário">
    <ul>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--scheduled" /><span>Eventos programados</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--today" /><span>Dia atual</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--read-only" /><span>Somente consulta</span></li>
    </ul>
    <p>Eventos em andamento, encerrados ou inativados ficam cinza.</p>
  </section>
}

export default EventCalendarLegend
