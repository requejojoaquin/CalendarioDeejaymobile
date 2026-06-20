import { useCalendario } from '../../context/CalendarioContext'

const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']

function GrillaCalendario({ mesActual, anioActual, onDiaClick, vistaActual, diaSeleccionado, onEventoClick }) {
  const { eventos, calendarios } = useCalendario()
  const hoy = new Date()

  const formatYMD = (y, m, d) => {
    const dateObj = new Date(y, m, d)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // ¿El calendario del evento está visible? (true si no hay preferencia).
  const calVisible = (ev) => calendarios.find((c) => c.id === ev.calendarioId)?.visible !== false

  // Rango de fechas del evento, normalizado. Soporta fechaInicio/fechaFin y el
  // campo legacy `fecha`. Un evento "ocupa" desde inicio hasta fin (inclusive).
  const rangoEvento = (ev) => {
    const inicio = ev.fechaInicio || ev.fecha
    const fin = ev.fechaFin || ev.fecha
    return { inicio, fin }
  }

  // BUG 1 — Filtro unificado por RANGO usado por TODAS las vistas:
  // un evento aparece en `fechaKey` si inicio <= fechaKey <= fin (y es visible).
  const eventoEnFecha = (ev, fechaKey) => {
    const { inicio, fin } = rangoEvento(ev)
    if (!inicio) return false
    return inicio <= fechaKey && fechaKey <= fin && calVisible(ev)
  }

  // BUG 2 — Un evento es "de todo el día" si está marcado o no tiene hora.
  const esTodoElDia = (ev) => ev.todoElDia || !ev.hora

  // Color efectivo del evento (color propio > color del calendario > accent).
  const colorEvento = (ev) =>
    ev.color || calendarios.find((c) => c.id === ev.calendarioId)?.color || 'var(--accent-color)'

  const eventosDeFecha = (fechaKey) => eventos.filter((ev) => eventoEnFecha(ev, fechaKey))

  // --- VISTA MES ---
  const renderVistaMes = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    const dias = []
    const ultimoDiaMesAnterior = new Date(anioActual, mesActual, 0).getDate()

    for (let i = primerDia - 1; i >= 0; i--) {
      dias.push({ dia: ultimoDiaMesAnterior - i, mes: 'anterior' })
    }
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push({ dia: i, mes: 'actual' })
    }
    const totalCeldas = 42
    const diasSiguiente = totalCeldas - dias.length
    for (let i = 1; i <= diasSiguiente; i++) {
      dias.push({ dia: i, mes: 'siguiente' })
    }

    return (
      <div className="flex-1 grid grid-cols-7 grid-rows-6 h-full">
        {dias.map((item, index) => {
          let m = mesActual
          if (item.mes === 'anterior') m--
          if (item.mes === 'siguiente') m++
          const fechaKey = formatYMD(anioActual, m, item.dia)
          const eventosDia = eventosDeFecha(fechaKey)
          const esHoy = item.dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear() && item.mes === 'actual'

          return (
            <div
              key={index}
              onClick={() => item.mes === 'actual' && onDiaClick(item.dia)}
              className={`border-r border-b border-[var(--border-color)] p-1 min-h-0 flex flex-col gap-0.5 transition-colors duration-100 cursor-pointer
                ${item.mes !== 'actual'
                  ? 'bg-[var(--bg-secondary)]/40 text-[var(--text-tertiary)]'
                  : 'bg-[var(--bg-primary)] hover:bg-[var(--hover-color)]'}`}
            >
              <div className="flex justify-center mb-0.5">
                <span className={`font-num text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${esHoy
                    ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)]'
                    : item.mes === 'actual' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                  {item.dia}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {eventosDia.slice(0, 4).map((ev) => {
                  const { inicio, fin } = rangoEvento(ev)
                  const esInicio = fechaKey === inicio
                  const esFin = fechaKey === fin
                  const esMultidia = inicio !== fin
                  const todoDia = esTodoElDia(ev)

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventoClick(ev) }}
                      title={ev.titulo}
                      className={`group/chip flex items-center gap-1 px-1.5 py-[3px] text-[11px] font-medium text-white shadow-[var(--shadow-sm)] hover:brightness-[1.08] transition-[filter] duration-100 leading-tight min-w-0
                        [text-shadow:0_1px_1px_rgba(0,0,0,0.18)]
                        ${!esMultidia ? 'rounded-md mx-0.5' : ''}
                        ${esMultidia && esInicio ? 'rounded-l-md ml-0.5' : ''}
                        ${esMultidia && esFin ? 'rounded-r-md mr-0.5' : ''}`}
                      style={{ backgroundColor: colorEvento(ev) }}
                    >
                      {esInicio && !todoDia && ev.hora && (
                        <span className="font-num shrink-0 text-[10px] font-semibold text-white/85">{ev.hora}</span>
                      )}
                      <span className="truncate">{ev.titulo}</span>
                    </div>
                  )
                })}
                {eventosDia.length > 4 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDiaClick(item.dia) }}
                    className="text-[11px] font-medium text-[var(--text-secondary)] text-left mx-0.5 px-1.5 py-[3px] mt-auto rounded-md hover:bg-[var(--hover-color)] hover:text-[var(--accent-color)] transition-colors duration-100"
                  >
                    <span className="font-num">+{eventosDia.length - 4}</span> más
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- VISTA SEMANA ---
  const renderVistaSemana = () => {
    const fechaBase = new Date(anioActual, mesActual, diaSeleccionado)
    const diaSemana = fechaBase.getDay()
    const inicioSemana = new Date(fechaBase)
    inicioSemana.setDate(fechaBase.getDate() - diaSemana)

    const diasSemanaArr = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana)
      d.setDate(inicioSemana.getDate() + i)
      diasSemanaArr.push(d)
    }

    return (
      <div className="flex-1 grid grid-cols-7 h-full divide-x divide-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
        {diasSemanaArr.map((fecha, i) => {
          const fechaKey = formatYMD(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
          // BUG 1 — antes era `ev.fecha === fechaKey`; ahora filtra por rango.
          const eventosDia = eventosDeFecha(fechaKey)
          const todoDiaEventos = eventosDia.filter(esTodoElDia)
          const conHora = eventosDia.filter((ev) => !esTodoElDia(ev))
          const esHoy = fecha.toDateString() === hoy.toDateString()

          return (
            <div key={i} className="flex flex-col h-full min-h-0 bg-[var(--bg-primary)]">
              <button
                onClick={() => onDiaClick(fecha.getDate())}
                className="p-3 border-b border-[var(--border-color)] flex flex-col items-center gap-1 hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
              >
                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">{DIAS_SEMANA[i]}</span>
                <span className={`font-num text-xl font-medium w-10 h-10 flex items-center justify-center rounded-full
                  ${esHoy ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)]' : 'text-[var(--text-primary)]'}`}>
                  {fecha.getDate()}
                </span>
              </button>

              {/* Franja "Todo el día" */}
              {todoDiaEventos.length > 0 && (
                <div className="px-1.5 py-1.5 flex flex-col gap-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40">
                  {todoDiaEventos.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onEventoClick(ev)}
                      title={ev.titulo}
                      className="px-2 py-1 rounded-md text-[11px] font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] transition-[filter] duration-100 truncate"
                      style={{ backgroundColor: colorEvento(ev) }}
                    >
                      {ev.titulo}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 min-h-0 p-1.5 space-y-1.5 overflow-y-auto custom-scrollbar">
                {conHora.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventoClick(ev)}
                    title={ev.titulo}
                    className="flex gap-2 p-2 rounded-md text-xs font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] active:scale-[0.99] transition-[filter] duration-100"
                    style={{ backgroundColor: colorEvento(ev) }}
                  >
                    <span className="w-1 shrink-0 rounded-full bg-white/40" />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">{ev.titulo}</span>
                      {ev.hora && <span className="font-num text-[10px] font-medium text-white/85 mt-0.5">{ev.hora}</span>}
                    </span>
                  </div>
                ))}
                {eventosDia.length === 0 && (
                  <div className="h-full" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- VISTA DIA ---
  const renderVistaDia = () => {
    const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')
    const fechaKey = formatYMD(anioActual, mesActual, diaSeleccionado)
    // BUG 1 — filtra por rango (incluye eventos multi-día que cruzan este día).
    const eventosDia = eventosDeFecha(fechaKey)
    // BUG 2 — separa todo-el-día (sin hora) para no llamar startsWith sobre null.
    const todoDiaEventos = eventosDia.filter(esTodoElDia)
    const conHora = eventosDia.filter((ev) => !esTodoElDia(ev))
    const esHoy = formatYMD(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) === fechaKey

    return (
      <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden animate-fade-in">
        {/* Cabezal del día */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-end gap-4 bg-[var(--bg-secondary)]/40">
          <span className={`font-num text-5xl font-semibold tracking-tight leading-none ${esHoy ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}>
            {diaSeleccionado}
          </span>
          <div className="flex flex-col mb-1">
            <span className="text-xl font-semibold text-[var(--text-primary)]">{DIAS_SEMANA[new Date(anioActual, mesActual, diaSeleccionado).getDay()]}</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{MESES_NOMBRES[mesActual]} {anioActual}</span>
          </div>
        </div>

        {/* Franja "Todo el día" */}
        {todoDiaEventos.length > 0 && (
          <div className="px-6 py-2 border-b border-[var(--border-color)] flex items-start gap-4 bg-[var(--bg-secondary)]/20">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide pt-1.5 w-20 flex-shrink-0">Todo el día</span>
            <div className="flex-1 flex flex-wrap gap-1.5 py-1">
              {todoDiaEventos.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onEventoClick(ev)}
                  title={ev.titulo}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] transition-[filter] duration-100"
                  style={{ backgroundColor: colorEvento(ev) }}
                >
                  {ev.titulo}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cronograma por horas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
          <div className="relative min-w-full pb-16">
            {horas.map((hora) => {
              // BUG 2 — guarda de null: (ev.hora||'').startsWith(...) nunca crashea.
              const eventosHora = conHora.filter((ev) => (ev.hora || '').startsWith(hora.substring(0, 2)))
              return (
                <div key={hora} className="flex border-b border-[var(--border-color)] h-20 group transition-colors hover:bg-[var(--hover-color)]/40">
                  <div className="w-20 flex-shrink-0 flex justify-end pr-3 pt-1 border-r border-[var(--border-color)]">
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums">{hora}</span>
                  </div>
                  <div className="flex-1 relative px-1.5">
                    {eventosHora.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => onEventoClick(ev)}
                        title={ev.titulo}
                        className="absolute inset-x-2 top-1 bottom-1 p-2.5 rounded-md cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] active:scale-[0.99] transition-[filter] duration-100 z-10 overflow-hidden flex gap-2.5"
                        style={{ backgroundColor: colorEvento(ev) }}
                      >
                        <span className="w-1 rounded-full bg-white/40 flex-shrink-0" />
                        <span className="flex flex-col justify-center min-w-0">
                          <span className="text-xs font-medium text-white truncate leading-tight">{ev.titulo}</span>
                          {ev.hora && <span className="font-num text-[10px] text-white/85 font-medium mt-0.5">{ev.hora}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --- VISTA AÑO ---
  const renderVistaAnio = () => {
    return (
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 bg-[var(--bg-primary)] overflow-y-auto custom-scrollbar">
        {MESES_NOMBRES.map((nombre, mIdx) => {
          const primerDia = new Date(anioActual, mIdx, 1).getDay()
          const diasEnMes = new Date(anioActual, mIdx + 1, 0).getDate()
          const dias = []
          for (let i = 0; i < primerDia; i++) dias.push(null)
          for (let i = 1; i <= diasEnMes; i++) dias.push(i)

          return (
            <div key={nombre} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight ml-1">{nombre}</h3>
              <div className="grid grid-cols-7 text-[10px] font-medium text-[var(--text-tertiary)] mb-1">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {dias.map((d, i) => {
                  const fechaKey = d ? formatYMD(anioActual, mIdx, d) : null
                  // BUG 1 — antes `ev.fecha === fechaKey`; ahora respeta rango.
                  const tieneEventos = d && eventos.some((ev) => eventoEnFecha(ev, fechaKey))
                  const esHoy = d === hoy.getDate() && mIdx === hoy.getMonth() && anioActual === hoy.getFullYear()

                  return (
                    <button
                      key={i}
                      onClick={() => d && onDiaClick(d)}
                      disabled={!d}
                      aria-label={d ? `${d} de ${nombre}${tieneEventos ? ', con eventos' : ''}` : undefined}
                      className={`font-num text-[10px] text-center w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-100 mx-auto
                        ${esHoy
                          ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)] font-medium'
                          : tieneEventos
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-color)] font-medium'
                            : 'text-[var(--text-primary)]'}
                        ${!d ? 'invisible' : 'hover:bg-[var(--hover-color)] cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]'}`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 overflow-hidden">
      {/* Cabecera de días: solo en vista Mes */}
      {vistaActual === 'mes' && (
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="py-2.5 text-center text-[11px] font-medium text-[var(--text-tertiary)] border-r border-[var(--border-color)] last:border-r-0 tracking-wide uppercase">
              {dia}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {vistaActual === 'mes' && renderVistaMes()}
        {vistaActual === 'semana' && renderVistaSemana()}
        {vistaActual === 'dia' && renderVistaDia()}
        {vistaActual === 'anio' && renderVistaAnio()}
      </div>
    </div>
  )
}

export default GrillaCalendario
