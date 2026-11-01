function EventCalendarLegend() {
  return <section className="event-calendar-legend" aria-label="Legenda das cores do calendário">
    <ul>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--today" /><span>Dia atual</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--in-progress" /><span>Turma em andamento</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--scheduled" /><span>Eventos programados</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--inactive" /><span>Inativado / Cancelado</span></li>
      <li><span aria-hidden="true" className="event-calendar-legend-swatch event-calendar-item--read-only" /><span>Somente consulta / Já concluído</span></li>
    </ul>
    <p>A cor considera cada turma: em andamento fica âmbar; concluída ou com prazo encerrado, cinza. Inativados ou cancelados ficam vermelhos.</p>
  </section>
}

export default EventCalendarLegend
